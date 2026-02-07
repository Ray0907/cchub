import { rename, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

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

	// Write metadata so we know where to restore
	const meta_path = join(trash_project_dir, `${id}.meta.json`)
	await writeFile(meta_path, JSON.stringify({
		id,
		project: source_project,
		deleted_at: new Date().toISOString(),
		original_path: source_path
	}), 'utf-8')

	// Move JSONL to trash
	const dest_path = join(trash_project_dir, `${id}.jsonl`)
	await rename(source_path, dest_path)

	return { ok: true }
})
