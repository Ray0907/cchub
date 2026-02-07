import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface SearchResult {
	type: string
	name: string
	description: string
	path_relative: string
}

async function searchDir(
	path_dir: string,
	type: string,
	query_lower: string,
	parse: (raw: string, file: string) => { name: string; description: string } | null
): Promise<SearchResult[]> {
	let files: string[] = []
	try {
		const dirents = await readdir(path_dir)
		files = dirents.filter((f: string) => f.endsWith('.md'))
	}
	catch {
		return []
	}

	const results: SearchResult[] = []
	for (const file of files) {
		const path_file = join(path_dir, file)
		try {
			const content_raw = await readFile(path_file, 'utf-8')
			if (!content_raw.toLowerCase().includes(query_lower)) continue
			const parsed = parse(content_raw, file)
			if (parsed) {
				results.push({
					type,
					name: parsed.name,
					description: parsed.description,
					path_relative: `${type}/${file}`
				})
			}
		}
		catch {
			// skip unreadable
		}
	}
	return results
}

async function searchSkills(path_base: string, query_lower: string): Promise<SearchResult[]> {
	const path_dir = join(path_base, 'skills')
	let dirs: string[] = []
	try {
		const dirents = await readdir(path_dir, { withFileTypes: true })
		dirs = dirents.filter(d => d.isDirectory()).map(d => d.name)
	}
	catch {
		return []
	}

	const results: SearchResult[] = []
	for (const dir of dirs) {
		const path_file = join(path_dir, dir, 'SKILL.md')
		try {
			const content_raw = await readFile(path_file, 'utf-8')
			if (!content_raw.toLowerCase().includes(query_lower)) continue
			const parsed = parseSkillFrontmatter(content_raw)
			results.push({
				type: 'skills',
				name: parsed.name_skill || dir,
				description: parsed.description,
				path_relative: `skills/${dir}/SKILL.md`
			})
		}
		catch {
			// skip
		}
	}
	return results
}

async function searchRulesRecursive(
	path_dir: string,
	path_base: string,
	query_lower: string
): Promise<SearchResult[]> {
	let entries
	try {
		entries = await readdir(path_dir, { withFileTypes: true })
	}
	catch {
		return []
	}

	const results: SearchResult[] = []
	for (const entry of entries) {
		const path_full = join(path_dir, entry.name)
		if (entry.isDirectory()) {
			const children = await searchRulesRecursive(path_full, path_base, query_lower)
			results.push(...children)
		}
		else if (entry.name.endsWith('.md')) {
			try {
				const content_raw = await readFile(path_full, 'utf-8')
				if (!content_raw.toLowerCase().includes(query_lower)) continue
				const path_rel = path_full.slice(path_base.length + 1)
				results.push({
					type: 'rules',
					name: entry.name,
					description: '',
					path_relative: `rules/${path_rel}`
				})
			}
			catch {
				// skip
			}
		}
	}
	return results
}

export default defineApiHandler(async (event) => {
	const query = getQuery(event)
	const q = (query.q as string) || ''
	if (!q.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Missing search query "q"' })
	}

	const query_lower = q.toLowerCase()
	const base = getClaudeHome()

	const [results_agents, results_skills, results_commands, results_plans, results_rules] = await Promise.all([
		searchDir(join(base, 'agents'), 'agents', query_lower, (raw, file) => {
			const parsed = parseAgentFrontmatter(raw)
			return { name: parsed.name_agent || file.replace(/\.md$/, ''), description: parsed.description }
		}),
		searchSkills(base, query_lower),
		searchDir(join(base, 'commands'), 'commands', query_lower, (raw, file) => {
			const { data } = parseFrontmatter(raw)
			return { name: (data.name as string) || file.replace(/\.md$/, ''), description: (data.description as string) || '' }
		}),
		searchDir(join(base, 'plans'), 'plans', query_lower, (raw, file) => {
			const { data } = parseFrontmatter(raw)
			return { name: (data.name as string) || file.replace(/\.md$/, ''), description: (data.description as string) || '' }
		}),
		searchRulesRecursive(join(base, 'rules'), join(base, 'rules'), query_lower)
	])

	return {
		query: q,
		results: {
			agents: results_agents,
			skills: results_skills,
			commands: results_commands,
			plans: results_plans,
			rules: results_rules
		},
		count_total: results_agents.length + results_skills.length + results_commands.length + results_plans.length + results_rules.length
	}
})
