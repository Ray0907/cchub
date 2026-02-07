import { readFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const slug = getRouterParam(event, 'slug')
	if (!slug) {
		throw createError({ statusCode: 400, statusMessage: 'Missing rule path' })
	}
	for (const seg of slug.split('/')) {
		assertSafeSegment(seg, 'rule path segment')
	}

	const path_file = resolveClaudePath('rules', slug)

	const content_raw = await readFile(path_file, 'utf-8').catch(() => null)
	if (!content_raw) {
		throw createError({ statusCode: 404, statusMessage: 'Rule not found' })
	}

	const { data } = parseFrontmatter(content_raw)

	return {
		name_file: slug.split('/').pop() || slug,
		path_relative: slug,
		data,
		content_raw
	}
})
