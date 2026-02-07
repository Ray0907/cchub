import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('teams')
	let dirs: string[] = []
	try {
		const dirents = await readdir(path_dir, { withFileTypes: true })
		dirs = dirents.filter(d => d.isDirectory()).map(d => d.name)
	}
	catch {
		return []
	}

	const list_teams = []
	for (const dir of dirs) {
		const path_config = join(path_dir, dir, 'config.json')
		try {
			const raw = await readFile(path_config, 'utf-8')
			const config = JSON.parse(raw)
			list_teams.push({
				name_team: config.name || dir,
				name_dir: dir,
				config
			})
		}
		catch {
			list_teams.push({
				name_team: dir,
				name_dir: dir,
				config: null
			})
		}
	}

	return list_teams
})
