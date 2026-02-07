import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('skills')
	let entries: string[] = []
	try {
		const dirents = await readdir(path_dir, { withFileTypes: true })
		entries = dirents.filter(d => d.isDirectory()).map(d => d.name)
	}
	catch {
		return []
	}

	const list_skills = []
	for (const name of entries) {
		const path_file = join(path_dir, name, 'SKILL.md')
		try {
			const content_raw = await readFile(path_file, 'utf-8')
			const parsed = parseSkillFrontmatter(content_raw)
			list_skills.push({
				name_skill: parsed.name_skill || name,
				description: parsed.description,
				tools_allowed: parsed.tools_allowed,
				hooks: parsed.hooks,
				version: parsed.version,
				name_dir: name
			})
		}
		catch {
			list_skills.push({
				name_skill: name,
				description: '',
				tools_allowed: [],
				hooks: [],
				version: '',
				name_dir: name
			})
		}
	}

	return list_skills
})
