import matter from 'gray-matter'

const MATTER_OPTS = { engines: { javascript: false as never } }

export interface ParsedFrontmatter {
	data: Record<string, unknown>
	content: string
}

export interface AgentFrontmatter {
	name_agent: string
	description: string
	tools: string[]
	model: string
	content_body: string
}

export interface SkillFrontmatter {
	name_skill: string
	description: string
	tools_allowed: string[]
	hooks: string[]
	version: string
	content_body: string
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
	const { data, content } = matter(raw, MATTER_OPTS)
	return { data, content }
}

export function parseAgentFrontmatter(raw: string): AgentFrontmatter {
	const { data, content } = matter(raw, MATTER_OPTS)
	const tools_raw = data.tools || data.allowedTools || ''
	const tools = typeof tools_raw === 'string'
		? tools_raw.split(',').map((t: string) => t.trim()).filter(Boolean)
		: Array.isArray(tools_raw) ? tools_raw : []

	return {
		name_agent: data.name || '',
		description: data.description || '',
		tools,
		model: data.model || '',
		content_body: content.trim()
	}
}

export function parseSkillFrontmatter(raw: string): SkillFrontmatter {
	const { data, content } = matter(raw, MATTER_OPTS)

	return {
		name_skill: data.name || '',
		description: data.description || '',
		tools_allowed: Array.isArray(data.tools) ? data.tools : [],
		hooks: Array.isArray(data.hooks) ? data.hooks : [],
		version: data.version || '',
		content_body: content.trim()
	}
}
