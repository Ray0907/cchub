import { writeFile, chmod } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing hook name' })
	}
	assertSafeSegment(name, 'hook name')

	const { content_raw } = await readBody<{ content_raw: string }>(event)
	if (typeof content_raw !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing content_raw' })
	}

	const path_file = resolveClaudePath('hooks', name)
	const path_backup = await createBackup(path_file)
	await writeFile(path_file, content_raw, 'utf-8')
	await chmod(path_file, 0o755)

	return { success: true }
})
