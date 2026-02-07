import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('agents')
	let files: string[] = []
	try {
		const dirents = await readdir(path_dir)
		files = dirents.filter((f: string) => f.endsWith('.md'))
	}
	catch {
		return []
	}

	const list_agents = []
	for (const file of files) {
		const path_file = join(path_dir, file)
		try {
			const content_raw = await readFile(path_file, 'utf-8')
			const parsed = parseAgentFrontmatter(content_raw)
			const name_file = file.replace(/\.md$/, '')
			list_agents.push({
				name_agent: parsed.name_agent || name_file,
				description: parsed.description,
				tools: parsed.tools,
				model: parsed.model,
				name_file
			})
		}
		catch {
			// skip unreadable files
		}
	}

	return list_agents
})
