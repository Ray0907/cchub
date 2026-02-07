import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

interface ConversationMessage {
	role: 'user' | 'assistant'
	content: string
	timestamp: string
}

export default defineApiHandler(async (event) => {
	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Missing session ID' })
	}

	const projects_dir = resolveClaudePath('projects')
	let jsonl_path: string | null = null
	let dirs: string[]

	try {
		dirs = await readdir(projects_dir)
	}
	catch {
		throw createError({ statusCode: 500, statusMessage: 'Cannot read projects directory' })
	}

	let raw: string | null = null
	for (const dir of dirs) {
		const candidate = join(projects_dir, dir, `${id}.jsonl`)
		try {
			raw = await readFile(candidate, 'utf-8')
			jsonl_path = candidate
			break
		}
		catch {
			// Not in this directory, continue
		}
	}

	if (!jsonl_path || !raw) {
		throw createError({ statusCode: 404, statusMessage: `Session "${id}" not found` })
	}
	const lines = raw.split('\n').filter(l => l.trim())

	let cwd = ''
	const messages: ConversationMessage[] = []

	for (const line of lines) {
		let entry: any
		try {
			entry = JSON.parse(line)
		}
		catch {
			continue
		}

		// Extract cwd from any entry that has it
		if (entry.cwd && !cwd) {
			cwd = entry.cwd
		}

		if (entry.type === 'user') {
			// Skip meta/system messages
			if (entry.isMeta) continue

			const msg = entry.message
			if (!msg || msg.role !== 'user') continue

			// Skip tool_result messages (these are tool outputs, not user text)
			const content = msg.content
			if (Array.isArray(content) && content.length > 0 && content[0].type === 'tool_result') {
				continue
			}

			const text = extractContent(content)
			if (text) {
				messages.push({
					role: 'user',
					content: text,
					timestamp: entry.timestamp || ''
				})
			}
		}
		else if (entry.type === 'assistant') {
			const msg = entry.message
			if (!msg || msg.role !== 'assistant') continue

			const content = msg.content
			if (!Array.isArray(content)) continue

			// Only extract text blocks (skip tool_use blocks)
			const text_parts: string[] = []
			for (const block of content) {
				if (block.type === 'text' && block.text) {
					text_parts.push(block.text)
				}
			}

			const text = text_parts.join('\n')
			if (text) {
				messages.push({
					role: 'assistant',
					content: text,
					timestamp: entry.timestamp || ''
				})
			}
		}
	}

	return { id, cwd, messages }
})

function extractContent(content: unknown): string {
	if (typeof content === 'string') {
		return content
	}
	if (Array.isArray(content)) {
		const parts: string[] = []
		for (const block of content) {
			if (block.type === 'text' && block.text) {
				parts.push(block.text)
			}
		}
		return parts.join('\n')
	}
	return ''
}
