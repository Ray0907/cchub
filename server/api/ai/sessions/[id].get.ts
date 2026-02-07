import { readFile, readdir } from 'node:fs/promises'

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
	assertSafeSegment(id, 'session ID')

	const projects_dir = resolveClaudePath('projects')

	let dirs: string[]
	try {
		dirs = await readdir(projects_dir)
	}
	catch {
		throw createError({ statusCode: 500, statusMessage: 'Cannot read projects directory' })
	}

	let raw: string | null = null
	for (const dir of dirs) {
		const candidate = safeJoin(projects_dir, dir, `${id}.jsonl`)
		try {
			raw = await readFile(candidate, 'utf-8')
			break
		}
		catch {
			// Not in this directory, continue
		}
	}

	if (!raw) {
		throw createError({ statusCode: 404, statusMessage: 'Session not found' })
	}

	const lines = raw.split('\n').filter(l => l.trim())

	let cwd = ''
	const messages: ConversationMessage[] = []

	for (const line of lines) {
		let entry: Record<string, unknown>
		try {
			entry = JSON.parse(line)
		}
		catch {
			continue
		}

		if (!cwd && typeof entry.cwd === 'string') {
			cwd = entry.cwd
		}

		if (entry.type === 'user') {
			if (entry.isMeta) continue

			const msg = entry.message as { role?: string; content?: unknown } | undefined
			if (!msg || msg.role !== 'user') continue

			// Skip tool_result messages (tool outputs, not user text)
			if (Array.isArray(msg.content) && msg.content.length > 0 && msg.content[0].type === 'tool_result') {
				continue
			}

			const text = extractTextContent(msg.content)
			if (text) {
				messages.push({
					role: 'user',
					content: text,
					timestamp: (entry.timestamp as string) || ''
				})
			}
		}
		else if (entry.type === 'assistant') {
			const msg = entry.message as { role?: string; content?: unknown } | undefined
			if (!msg || msg.role !== 'assistant') continue
			if (!Array.isArray(msg.content)) continue

			const text_parts: string[] = []
			for (const block of msg.content as Array<{ type: string; text?: string }>) {
				if (block.type === 'text' && block.text) {
					text_parts.push(block.text)
				}
			}

			const text = text_parts.join('\n')
			if (text) {
				messages.push({
					role: 'assistant',
					content: text,
					timestamp: (entry.timestamp as string) || ''
				})
			}
		}
	}

	return { id, cwd, messages }
})
