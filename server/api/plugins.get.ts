import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('plugins')
	const path_settings = resolveClaudePath('settings.json')

	let list_plugins: { name_plugin: string; path_dir: string }[] = []
	try {
		const dirents = await readdir(path_dir, { withFileTypes: true })
		list_plugins = dirents
			.filter(d => d.isDirectory())
			.map(d => ({
				name_plugin: d.name,
				path_dir: join(path_dir, d.name)
			}))
	}
	catch {
		// plugins dir missing
	}

	let list_enabled: string[] = []
	try {
		const raw = await readFile(path_settings, 'utf-8')
		const settings = JSON.parse(raw)
		list_enabled = Array.isArray(settings.enabledPlugins) ? settings.enabledPlugins : []
	}
	catch {
		// settings missing
	}

	return list_plugins.map(p => ({
		name_plugin: p.name_plugin,
		is_enabled: list_enabled.includes(p.name_plugin)
	}))
})
