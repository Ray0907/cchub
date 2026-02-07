import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const SYSTEM_PREFIXES = [
	'<command-message>',
	'<command-name>',
	'<teammate-message',
	'<local-command',
	'<system-reminder>',
	'<task-notification>',
	'# Ralph Loop',
]

const MAX_SCAN_LINES = 80

export function extractTextContent(content: unknown): string {
	if (typeof content === 'string') return content.trim()

	if (Array.isArray(content)) {
		for (const block of content) {
			if (block && typeof block === 'object' && 'type' in block) {
				const typed = block as { type: string; text?: string }
				if (typed.type === 'text' && typeof typed.text === 'string') {
					return typed.text.trim()
				}
			}
		}
	}

	return ''
}

export function isSystemMessage(text: string): boolean {
	return SYSTEM_PREFIXES.some(p => text.startsWith(p))
}

function truncateTitle(text: string): string {
	return text.length > 100 ? text.slice(0, 100) + '...' : text
}

/**
 * Extract title and cwd from the first ~80 lines of a session JSONL file.
 * Reads via stream to avoid loading multi-MB files into memory.
 */
export async function extractSessionMeta(path_file: string): Promise<{ title: string; cwd: string }> {
	let title = ''
	let cwd = ''
	let count_lines = 0

	const stream = createReadStream(path_file, { encoding: 'utf-8' })
	const reader = createInterface({ input: stream })

	try {
		for await (const line of reader) {
			if (++count_lines > MAX_SCAN_LINES) break
			if (!line.trim()) continue

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

			if (!title && entry.type === 'user' && !entry.isMeta) {
				const msg = entry.message as { role?: string; content?: unknown } | undefined
				if (msg?.role === 'user' && msg.content) {
					const text = extractTextContent(msg.content)
					if (text && text.length > 1 && !isSystemMessage(text)) {
						title = truncateTitle(text)
					}
				}
			}

			if (title && cwd) break
		}
	}
	finally {
		stream.destroy()
	}

	return { title, cwd }
}

/**
 * Extract only the title from a session JSONL file.
 * Convenience wrapper around extractSessionMeta.
 */
export async function extractSessionTitle(path_file: string): Promise<string> {
	const { title } = await extractSessionMeta(path_file)
	return title
}
