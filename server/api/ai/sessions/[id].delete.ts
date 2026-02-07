import { rename, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export default defineApiHandler(async (event) => {
	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Missing session ID' })
	}

	const body = await readBody(event)
	const project = body?.project as string | undefined

	const projects_dir = resolveClaudePath('projects')
	const trash_dir = resolveClaudePath('trash')

	// Ensure trash directory exists
	await mkdir(trash_dir, { recursive: true })

	// Find the JSONL file
	let source_path: string | null = null
	let source_project: string | null = null

	if (project) {
		const candidate = join(projects_dir, project, `${id}.jsonl`)
		try {
			const info = await stat(candidate)
			if (info.isFile()) {
				source_path = candidate
				source_project = project
			}
		}
		catch {
			// Not found at expected location
		}
	}

	if (!source_path) {
		let dirs: string[]
		try {
			dirs = await readdir(projects_dir)
		}
		catch {
			throw createError({ statusCode: 500, statusMessage: 'Cannot read projects directory' })
		}

		for (const dir of dirs) {
			const candidate = join(projects_dir, dir, `${id}.jsonl`)
			try {
				const info = await stat(candidate)
				if (info.isFile()) {
					source_path = candidate
					source_project = dir
					break
				}
			}
			catch {
				continue
			}
		}
	}

	if (!source_path || !source_project) {
		throw createError({ statusCode: 404, statusMessage: `Session "${id}" not found` })
	}

	// Create project subfolder in trash to preserve origin
	const trash_project_dir = join(trash_dir, source_project)
	await mkdir(trash_project_dir, { recursive: true })

	// Extract title before moving file
	const title = await extractTitle(source_path)

	// Write metadata so we know where to restore
	const meta_path = join(trash_project_dir, `${id}.meta.json`)
	await writeFile(meta_path, JSON.stringify({
		id,
		project: source_project,
		deleted_at: new Date().toISOString(),
		original_path: source_path,
		title: title || id,
	}), 'utf-8')

	// Move JSONL to trash
	const dest_path = join(trash_project_dir, `${id}.jsonl`)
	await rename(source_path, dest_path)

	return { ok: true }
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
