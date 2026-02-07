import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export default defineApiHandler(async (event) => {
	const slug = getRouterParam(event, 'slug')
	if (!slug) {
		throw createError({ statusCode: 400, statusMessage: 'Missing rule path' })
	}
	for (const seg of slug.split('/')) {
		assertSafeSegment(seg, 'rule path segment')
	}

	const { content_raw } = await readBody<{ content_raw: string }>(event)
	if (typeof content_raw !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing content_raw' })
	}

	const path_file = resolveClaudePath('rules', slug)
	await mkdir(dirname(path_file), { recursive: true })
	const path_backup = await createBackup(path_file)
	await writeFile(path_file, content_raw, 'utf-8')

	return { success: true }
})
