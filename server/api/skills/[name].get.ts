import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing skill name' })
	}

	const path_dir = resolveClaudePath('skills', name)
	const path_file = join(path_dir, 'SKILL.md')

	const content_raw = await readFile(path_file, 'utf-8').catch(() => null)
	if (!content_raw) {
		throw createError({ statusCode: 404, statusMessage: `Skill "${name}" not found` })
	}

	const parsed = parseSkillFrontmatter(content_raw)

	return {
		name_skill: parsed.name_skill || name,
		description: parsed.description,
		tools_allowed: parsed.tools_allowed,
		hooks: parsed.hooks,
		version: parsed.version,
		name_dir: name,
		content_raw
	}
})
