import Database from 'better-sqlite3'
import { readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

export interface SearchResult {
	session_id: string
	project: string
	title: string
	cwd: string
	time_modified: string
	snippet: string
	score: number
}

const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const RECENCY_BOOST = 0.2
const INDEX_DEBOUNCE_MS = 60_000 // 60 seconds

let _db: Database.Database | null = null
let _last_indexed = 0

function getDbPath(): string {
	const home = getClaudeHome()
	return join(home, 'cchub-search.db')
}

export function getSearchDb(): Database.Database {
	if (_db) return _db

	const db_path = getDbPath()
	try {
		_db = new Database(db_path)
	} catch {
		// If DB is corrupted, delete and recreate
		try {
			unlinkSync(db_path)
		} catch { /* ignore */ }
		_db = new Database(db_path)
	}

	_db.pragma('journal_mode = WAL')

	_db.exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			project TEXT NOT NULL,
			path_file TEXT NOT NULL,
			cwd TEXT DEFAULT '',
			title TEXT DEFAULT '',
			mtime_ms INTEGER NOT NULL
		)
	`)

	_db.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS messages USING fts5(
			session_id UNINDEXED,
			role UNINDEXED,
			content,
			tokenize='porter unicode61'
		)
	`)

	return _db
}

export function indexAllSessions(): { indexed: number, skipped: number } {
	const db = getSearchDb()
	const projects_dir = join(getClaudeHome(), 'projects')

	let project_dirs: string[]
	try {
		project_dirs = readdirSync(projects_dir)
	} catch {
		return { indexed: 0, skipped: 0 }
	}

	const stmt_check = db.prepare('SELECT mtime_ms FROM sessions WHERE id = ?')
	const stmt_delete_session = db.prepare('DELETE FROM sessions WHERE id = ?')
	const stmt_delete_messages = db.prepare('DELETE FROM messages WHERE session_id = ?')
	const stmt_insert_session = db.prepare(
		'INSERT INTO sessions (id, project, path_file, cwd, title, mtime_ms) VALUES (?, ?, ?, ?, ?, ?)'
	)
	const stmt_insert_message = db.prepare(
		'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)'
	)

	let indexed = 0
	let skipped = 0

	const insertBatch = db.transaction((entries: Array<{
		session_id: string
		project: string
		path_file: string
		mtime_ms: number
		cwd: string
		title: string
		messages: Array<{ role: string, content: string }>
	}>) => {
		for (const entry of entries) {
			stmt_delete_messages.run(entry.session_id)
			stmt_delete_session.run(entry.session_id)
			stmt_insert_session.run(
				entry.session_id, entry.project, entry.path_file,
				entry.cwd, entry.title, entry.mtime_ms
			)
			for (const msg of entry.messages) {
				stmt_insert_message.run(entry.session_id, msg.role, msg.content)
			}
		}
	})

	const batch: Parameters<typeof insertBatch>[0] = []

	for (const dir_name of project_dirs) {
		const path_project = join(projects_dir, dir_name)
		let info_dir
		try {
			info_dir = statSync(path_project)
		} catch { continue }
		if (!info_dir.isDirectory()) continue

		let files: string[]
		try {
			files = readdirSync(path_project)
		} catch { continue }

		for (const file of files) {
			if (!file.endsWith('.jsonl')) continue

			const path_file = join(path_project, file)
			let info_file
			try {
				info_file = statSync(path_file)
			} catch { continue }

			const session_id = file.replace(/\.jsonl$/, '')
			const mtime_ms = Math.floor(info_file.mtimeMs)

			// Check if already indexed with same mtime
			const existing = stmt_check.get(session_id) as { mtime_ms: number } | undefined
			if (existing && existing.mtime_ms === mtime_ms) {
				skipped++
				continue
			}

			// Read and parse the file
			let raw: string
			try {
				raw = readFileSync(path_file, 'utf-8')
			} catch { continue }

			const lines = raw.split('\n').filter(l => l.trim())
			const { cwd, messages } = parseSessionMessages(lines)

			// Extract title from first user message
			const title = messages.find(m => m.role === 'user')?.content.slice(0, 100) || session_id

			batch.push({
				session_id,
				project: dir_name,
				path_file,
				mtime_ms,
				cwd,
				title,
				messages: messages.map(m => ({ role: m.role, content: m.content }))
			})

			indexed++

			// Flush batch every 50 sessions
			if (batch.length >= 50) {
				insertBatch(batch)
				batch.length = 0
			}
		}
	}

	// Flush remaining
	if (batch.length > 0) {
		insertBatch(batch)
	}

	_last_indexed = Date.now()
	return { indexed, skipped }
}

export function ensureIndexFresh(): void {
	if (Date.now() - _last_indexed < INDEX_DEBOUNCE_MS) return
	indexAllSessions()
}

export function searchMessages(query: string, options?: { limit?: number, project?: string }): SearchResult[] {
	const db = getSearchDb()
	const limit = Math.min(options?.limit || 20, 100)
	const now = Date.now()

	let sql = `
		SELECT
			s.id as session_id,
			s.project,
			s.title,
			s.cwd,
			s.mtime_ms,
			snippet(messages, 2, '<mark>', '</mark>', '...', 40) as snippet,
			rank * (1.0 + ? * max(0, 1.0 - ((? - s.mtime_ms) * 1.0 / ?))) as score
		FROM messages
		JOIN sessions s ON messages.session_id = s.id
		WHERE messages MATCH ?
	`
	const params: (string | number)[] = [RECENCY_BOOST, now, HALF_LIFE_MS, query]

	if (options?.project) {
		sql += ' AND s.project = ?'
		params.push(options.project)
	}

	// Group by session to avoid duplicate sessions, take best snippet per session
	sql += `
		GROUP BY s.id
		ORDER BY min(score)
		LIMIT ?
	`
	params.push(limit)

	try {
		const rows = db.prepare(sql).all(...params) as Array<{
			session_id: string
			project: string
			title: string
			cwd: string
			mtime_ms: number
			snippet: string
			score: number
		}>

		return rows.map(row => ({
			session_id: row.session_id,
			project: row.project,
			title: row.title,
			cwd: row.cwd,
			time_modified: new Date(row.mtime_ms).toISOString(),
			snippet: row.snippet,
			score: row.score
		}))
	} catch {
		// FTS5 query syntax error — return empty
		return []
	}
}
