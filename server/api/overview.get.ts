import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const DIRS = ['agents', 'skills', 'rules', 'hooks', 'commands', 'plans', 'sessions', 'teams']

interface RecentFile {
	name_file: string
	dir: string
	time_modified: string
}

export default defineApiHandler(async () => {
	const base = getClaudeHome()
	const counts: Record<string, number> = {}
	const list_recent: RecentFile[] = []

	for (const dir of DIRS) {
		const path_dir = join(base, dir)
		try {
			const entries = await readdir(path_dir, { withFileTypes: true })
			counts[dir] = entries.length
			for (const entry of entries) {
				const path_full = join(path_dir, entry.name)
				const info = await stat(path_full).catch(() => null)
				if (info) {
					list_recent.push({
						name_file: entry.name,
						dir,
						time_modified: info.mtime.toISOString()
					})
				}
			}
		}
		catch {
			counts[dir] = 0
		}
	}

	list_recent.sort((a, b) => b.time_modified.localeCompare(a.time_modified))

	return {
		counts,
		list_recent: list_recent.slice(0, 10)
	}
})
