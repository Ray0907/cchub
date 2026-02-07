import { readFile, stat } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing plan name' })
	}

	const path_file = resolveClaudePath('plans', `${name}.md`)

	const [content_raw, info] = await Promise.all([
		readFile(path_file, 'utf-8').catch(() => null),
		stat(path_file).catch(() => null)
	])

	if (!content_raw) {
		throw createError({ statusCode: 404, statusMessage: `Plan "${name}" not found` })
	}

	const { data } = parseFrontmatter(content_raw)

	return {
		name_plan: (data.name as string) || name,
		description: (data.description as string) || '',
		name_file: `${name}.md`,
		time_modified: info?.mtime.toISOString() || '',
		content_raw
	}
})
