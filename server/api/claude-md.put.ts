import { writeFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const { content_raw } = await readBody<{ content_raw: string }>(event)
	if (typeof content_raw !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing content_raw' })
	}

	const path_file = resolveClaudePath('CLAUDE.md')
	const path_backup = await createBackup(path_file)
	await writeFile(path_file, content_raw, 'utf-8')

	return { success: true }
})
