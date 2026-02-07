import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('sessions')
	let files: string[] = []
	try {
		const dirents = await readdir(path_dir)
		files = dirents.filter((f: string) => f.endsWith('.tmp'))
	}
	catch {
		return []
	}

	const list_sessions = []
	for (const file of files) {
		const path_full = join(path_dir, file)
		const info = await stat(path_full).catch(() => null)
		if (info) {
			list_sessions.push({
				name_file: file.replace(/\.tmp$/, ''),
				time_modified: info.mtime.toISOString()
			})
		}
	}

	list_sessions.sort((a, b) => b.time_modified.localeCompare(a.time_modified))

	return list_sessions
})
