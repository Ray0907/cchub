import { readFile, stat } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing session name' })
	}

	const path_file = resolveClaudePath('sessions', `${name}.tmp`)

	const [content_raw, info] = await Promise.all([
		readFile(path_file, 'utf-8').catch(() => null),
		stat(path_file).catch(() => null)
	])

	if (!content_raw) {
		throw createError({ statusCode: 404, statusMessage: `Session "${name}" not found` })
	}

	return {
		name_file: name,
		time_modified: info?.mtime.toISOString() || '',
		content_raw
	}
})
