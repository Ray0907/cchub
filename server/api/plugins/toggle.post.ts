import { readFile, writeFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const { id_plugin, is_enabled } = await readBody<{
		id_plugin: string
		is_enabled: boolean
	}>(event)

	if (!id_plugin || typeof id_plugin !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing id_plugin' })
	}
	if (typeof is_enabled !== 'boolean') {
		throw createError({ statusCode: 400, statusMessage: 'Missing is_enabled boolean' })
	}

	const path_file = resolveClaudePath('settings.json')
	const path_backup = await createBackup(path_file)

	let settings: Record<string, unknown> = {}
	try {
		const raw = await readFile(path_file, 'utf-8')
		settings = JSON.parse(raw)
	}
	catch {
		// start with empty settings
	}

	const list_enabled = Array.isArray(settings.enabledPlugins)
		? [...settings.enabledPlugins] as string[]
		: []
	const list_disabled = Array.isArray(settings.disabledPlugins)
		? [...settings.disabledPlugins] as string[]
		: []

	if (is_enabled) {
		if (!list_enabled.includes(id_plugin)) {
			list_enabled.push(id_plugin)
		}
		const idx = list_disabled.indexOf(id_plugin)
		if (idx !== -1) {
			list_disabled.splice(idx, 1)
		}
	}
	else {
		if (!list_disabled.includes(id_plugin)) {
			list_disabled.push(id_plugin)
		}
		const idx = list_enabled.indexOf(id_plugin)
		if (idx !== -1) {
			list_enabled.splice(idx, 1)
		}
	}

	const settings_updated = {
		...settings,
		enabledPlugins: list_enabled,
		disabledPlugins: list_disabled
	}

	await writeFile(path_file, JSON.stringify(settings_updated, null, 2) + '\n', 'utf-8')

	return { success: true }
})
