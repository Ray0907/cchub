import { writeFile, access } from 'node:fs/promises'
import matter from 'gray-matter'

export default defineApiHandler(async (event) => {
	const { name_agent, frontmatter, content_body } = await readBody<{
		name_agent: string
		frontmatter: Record<string, unknown>
		content_body: string
	}>(event)

	if (!name_agent || typeof name_agent !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing name_agent' })
	}
	if (!/^[a-zA-Z0-9-]+$/.test(name_agent)) {
		throw createError({ statusCode: 400, statusMessage: 'name_agent must be alphanumeric with hyphens only' })
	}
	if (!frontmatter || typeof frontmatter !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Missing frontmatter object' })
	}
	if (typeof content_body !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing content_body' })
	}

	const path_file = resolveClaudePath('agents', `${name_agent}.md`)

	const is_exists = await access(path_file).then(() => true).catch(() => false)
	if (is_exists) {
		throw createError({ statusCode: 409, statusMessage: `Agent "${name_agent}" already exists` })
	}

	const content_raw = matter.stringify(content_body, frontmatter)
	await writeFile(path_file, content_raw, 'utf-8')

	return { success: true, path_backup: null }
})
