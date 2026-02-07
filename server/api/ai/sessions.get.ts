import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

interface SessionEntry {
	id: string
	title: string
	cwd: string
	time_modified: string
	project: string
}

export default defineApiHandler(async (event) => {
	const query = getQuery(event)
	const filter_q = ((query.q as string) || '').toLowerCase()
	const filter_project = (query.project as string) || ''
	const limit_count = Math.min(Number(query.limit) || 50, 200)

	const path_projects = resolveClaudePath('projects')

	let list_project_dirs: string[]
	try {
		list_project_dirs = await readdir(path_projects)
	}
	catch {
		return { sessions: [], projects: [], count_total: 0, count_filtered: 0 }
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
			const meta = await extractSessionMeta(path_file).catch(() => ({ title: '', cwd: '' }))

			list_sessions.push({
				id: session_id,
				title: meta.title || session_id,
				cwd: meta.cwd || '',
				time_modified: info_file.mtime.toISOString(),
				project: dir_name,
			})
		}
	}

	list_sessions.sort((a, b) => b.time_modified.localeCompare(a.time_modified))

	let filtered = list_sessions

	if (filter_q) {
		filtered = filtered.filter(s =>
			s.title.toLowerCase().includes(filter_q)
			|| s.cwd.toLowerCase().includes(filter_q)
			|| s.id.toLowerCase().includes(filter_q)
		)
	}

	if (filter_project) {
		filtered = filtered.filter(s => s.project === filter_project)
	}

	const list_projects = [...new Set(list_sessions.map(s => s.project))].sort()

	return {
		sessions: filtered.slice(0, limit_count),
		projects: list_projects,
		count_total: list_sessions.length,
		count_filtered: filtered.length
	}
})
