export interface ParsedMessage {
	role: 'user' | 'assistant'
	content: string
	timestamp: string
}

export interface ParsedSession {
	cwd: string
	messages: ParsedMessage[]
}

/**
 * Parse user and assistant messages from raw JSONL lines of a Claude session file.
 * Reuses extractTextContent() and isSystemMessage() from sessionMeta.ts (auto-imported by Nitro).
 */
export function parseSessionMessages(lines: string[]): ParsedSession {
	let cwd = ''
	const messages: ParsedMessage[] = []

	for (const line of lines) {
		if (!line.trim()) continue

		let entry: Record<string, unknown>
		try {
			entry = JSON.parse(line)
		} catch {
			continue
		}

		if (!cwd && typeof entry.cwd === 'string') {
			cwd = entry.cwd
		}

		if (entry.type === 'user') {
			if (entry.isMeta) continue

			const msg = entry.message as { role?: string, content?: unknown } | undefined
			if (!msg || msg.role !== 'user') continue

			// Skip tool_result messages (tool outputs, not user text)
			if (Array.isArray(msg.content) && msg.content.length > 0 && msg.content[0].type === 'tool_result') {
				continue
			}

			const text = extractTextContent(msg.content)
			if (text && !isSystemMessage(text)) {
				messages.push({
					role: 'user',
					content: text,
					timestamp: (entry.timestamp as string) || ''
				})
			}
		} else if (entry.type === 'assistant') {
			const msg = entry.message as { role?: string, content?: unknown } | undefined
			if (!msg || msg.role !== 'assistant') continue
			if (!Array.isArray(msg.content)) continue

			const text_parts: string[] = []
			for (const block of msg.content as Array<{ type: string, text?: string }>) {
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

	return { cwd, messages }
}
