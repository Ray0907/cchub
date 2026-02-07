import { writeFile } from 'node:fs/promises'
import matter from 'gray-matter'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing agent name' })
	}

	const { frontmatter, content_body } = await readBody<{
		frontmatter: Record<string, unknown>
		content_body: string
	}>(event)

	if (!frontmatter || typeof frontmatter !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Missing frontmatter object' })
	}
	if (typeof content_body !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing content_body' })
	}

	const path_file = resolveClaudePath('agents', `${name}.md`)
	const path_backup = await createBackup(path_file)
	const content_raw = matter.stringify(content_body, frontmatter)
	await writeFile(path_file, content_raw, 'utf-8')

	return { success: true, path_backup }
})
