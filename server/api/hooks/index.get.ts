import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('hooks')
	const path_settings = resolveClaudePath('settings.json')

	let list_scripts: { name_file: string; content_raw: string }[] = []
	try {
		const dirents = await readdir(path_dir)
		const files_sh = dirents.filter((f: string) => f.endsWith('.sh'))
		list_scripts = await Promise.all(
			files_sh.map(async (file: string) => {
				const path_file = join(path_dir, file)
				const content_raw = await readFile(path_file, 'utf-8').catch(() => '')
				return { name_file: file, content_raw }
			})
		)
	}
	catch {
		// hooks dir missing
	}

	let config_hooks: unknown = null
	try {
		const raw = await readFile(path_settings, 'utf-8')
		const settings = JSON.parse(raw)
		config_hooks = settings.hooks || null
	}
	catch {
		// settings missing or no hooks config
	}

	return { list_scripts, config_hooks }
})
