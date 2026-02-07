import { writeFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const { type, data } = await readBody<{ type: string; data: object }>(event)

	if (type !== 'global' && type !== 'local') {
		throw createError({ statusCode: 400, statusMessage: 'type must be "global" or "local"' })
	}
	if (!data || typeof data !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Missing data object' })
	}

	const name_file = type === 'local' ? 'settings.local.json' : 'settings.json'
	const path_file = resolveClaudePath(name_file)
	const path_backup = await createBackup(path_file)
	await writeFile(path_file, JSON.stringify(data, null, 2) + '\n', 'utf-8')

	return { success: true }
})
