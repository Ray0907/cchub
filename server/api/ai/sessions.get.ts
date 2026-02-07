import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

interface SessionEntry {
	id: string
	title: string
	cwd: string
	time_modified: string
	project: string
}

export default defineApiHandler(async () => {
	const path_projects = resolveClaudePath('projects')

	let list_project_dirs: string[]
	try {
		list_project_dirs = await readdir(path_projects)
	}
	catch {
		return []
	}

	const list_sessions: SessionEntry[] = []

	for (const dir_name of list_project_dirs) {
		const path_project = join(path_projects, dir_name)
		const info_dir = await stat(path_project).catch(() => null)
		if (!info_dir?.isDirectory()) continue

		let files: string[]
		try {
			files = await readdir(path_project)
		}
		catch {
			continue
		}

		for (const file of files) {
			if (!file.endsWith('.jsonl')) continue

			const path_file = join(path_project, file)
			const info_file = await stat(path_file).catch(() => null)
			if (!info_file) continue

			const session_id = file.replace(/\.jsonl$/, '')

			try {
				const meta = await extractSessionMeta(path_file)
				list_sessions.push({
					id: session_id,
					title: meta.title || session_id,
					cwd: meta.cwd || '',
					time_modified: info_file.mtime.toISOString(),
					project: dir_name,
				})
			}
			catch {
				list_sessions.push({
					id: session_id,
					title: session_id,
					cwd: '',
					time_modified: info_file.mtime.toISOString(),
					project: dir_name,
				})
			}
		}
	}

	list_sessions.sort((a, b) => b.time_modified.localeCompare(a.time_modified))

	return list_sessions.slice(0, 50)
})

async function extractSessionMeta(path_file: string): Promise<{ title: string; cwd: string }> {
	let title = ''
	let cwd = ''
	let count_lines = 0

	const stream = createReadStream(path_file, { encoding: 'utf-8' })
	const reader = createInterface({ input: stream })

	try {
		for await (const line of reader) {
			if (++count_lines > 80) break
			if (!line.trim()) continue

			let entry: Record<string, unknown>
			try {
				entry = JSON.parse(line)
			}
			catch {
				continue
			}

			if (!cwd && typeof entry.cwd === 'string') {
				cwd = entry.cwd
			}

			if (!title && entry.type === 'user' && !entry.isMeta) {
				const msg = entry.message as { role?: string; content?: unknown } | undefined
				if (msg?.role === 'user' && msg.content) {
					const text = extractTextContent(msg.content)
					if (text && text.length > 1 && !isSystemMessage(text)) {
						title = text.length > 100 ? text.slice(0, 100) + '...' : text
					}
				}
			}

			if (title && cwd) break
		}
	}
	finally {
		stream.destroy()
	}

	return { title, cwd }
}

function isSystemMessage(text: string): boolean {
	const prefixes = [
		'<command-message>',
		'<command-name>',
		'<teammate-message',
		'<local-command',
		'<system-reminder>',
		'<task-notification>',
		'# Ralph Loop',
	]
	return prefixes.some(p => text.startsWith(p))
}

function extractTextContent(content: unknown): string {
	if (typeof content === 'string') return content.trim()

	if (Array.isArray(content)) {
		for (const block of content) {
			if (block && typeof block === 'object' && 'type' in block) {
				const typed = block as { type: string; text?: string }
				if (typed.type === 'text' && typeof typed.text === 'string') {
					return typed.text.trim()
				}
			}
		}
	}

	return ''
}
