import { readFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing agent name' })
	}

	const path_file = resolveClaudePath('agents', `${name}.md`)

	const content_raw = await readFile(path_file, 'utf-8').catch(() => null)
	if (!content_raw) {
		throw createError({ statusCode: 404, statusMessage: `Agent "${name}" not found` })
	}

	const parsed = parseAgentFrontmatter(content_raw)

	return {
		name_agent: parsed.name_agent || name,
		description: parsed.description,
		tools: parsed.tools,
		model: parsed.model,
		name_file: name,
		content_raw
	}
})
