import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export default defineApiHandler(async () => {
	const trash_dir = resolveClaudePath('trash')

	let project_dirs: string[]
	try {
		project_dirs = await readdir(trash_dir)
	}
	catch {
		return []
	}

	const list_items: Array<{ id: string; title: string; project: string; deleted_at: string }> = []

	for (const proj_dir of project_dirs) {
		const path_proj = join(trash_dir, proj_dir)
		const info = await stat(path_proj).catch(() => null)
		if (!info?.isDirectory()) continue

		let files: string[]
		try {
			files = await readdir(path_proj)
		}
		catch {
			continue
		}

		for (const file of files) {
			if (!file.endsWith('.meta.json')) continue

			const meta_path = join(path_proj, file)
			try {
				const raw = await readFile(meta_path, 'utf-8')
				const meta = JSON.parse(raw)

				// Use title from meta if available (written by delete handler)
				let title = meta.title || meta.id

				// If no title in meta, try to extract from the .jsonl file
				if (!meta.title) {
					const jsonl_path = join(path_proj, `${meta.id}.jsonl`)
					try {
						title = await extractTitle(jsonl_path) || meta.id
					}
					catch {
						// Use ID as fallback title
					}
				}

				list_items.push({
					id: meta.id,
					title,
					project: meta.project,
					deleted_at: meta.deleted_at,
				})
			}
			catch {
				continue
			}
		}
	}

	list_items.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at))
	return list_items
})

async function extractTitle(path_file: string): Promise<string> {
	let count_lines = 0

	const stream = createReadStream(path_file, { encoding: 'utf-8' })
	const reader = createInterface({ input: stream })

	try {
		for await (const line of reader) {
			if (++count_lines > 80) break
			if (!line.trim()) continue

			let entry: Record<string, unknown>
			try {
				entry = JSON.parse(line)
			}
			catch {
				continue
			}

			if (entry.type === 'user' && !entry.isMeta) {
				const msg = entry.message as { role?: string; content?: unknown } | undefined
				if (msg?.role === 'user' && msg.content) {
					const text = extractTextContent(msg.content)
					if (text && text.length > 1 && !isSystemMessage(text)) {
						return text.length > 100 ? text.slice(0, 100) + '...' : text
					}
				}
			}
		}
	}
	finally {
		stream.destroy()
	}

	return ''
}

function isSystemMessage(text: string): boolean {
	const prefixes = [
		'<command-message>',
		'<command-name>',
		'<teammate-message',
		'<local-command',
		'<system-reminder>',
		'<task-notification>',
		'# Ralph Loop',
	]
	return prefixes.some(p => text.startsWith(p))
}

function extractTextContent(content: unknown): string {
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
