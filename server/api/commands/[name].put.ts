import { writeFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing command name' })
	}

	const { content_raw } = await readBody<{ content_raw: string }>(event)
	if (typeof content_raw !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing content_raw' })
	}

	const path_file = resolveClaudePath('commands', `${name}.md`)
	const path_backup = await createBackup(path_file)
	await writeFile(path_file, content_raw, 'utf-8')

	return { success: true, path_backup }
})
