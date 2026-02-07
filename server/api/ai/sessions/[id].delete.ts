import { rename, mkdir, readdir, stat, writeFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Missing session ID' })
	}
	assertSafeSegment(id, 'session ID')

	const body = await readBody(event)
	const project = body?.project as string | undefined
	if (project) assertSafeSegment(project, 'project')

	const projects_dir = resolveClaudePath('projects')
	const trash_dir = resolveClaudePath('trash')

	await mkdir(trash_dir, { recursive: true })

	// Find the JSONL file
	let source_path: string | null = null
	let source_project: string | null = null

	if (project) {
		const candidate = safeJoin(projects_dir, project, `${id}.jsonl`)
		const info = await stat(candidate).catch(() => null)
		if (info?.isFile()) {
			source_path = candidate
			source_project = project
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
			const candidate = safeJoin(projects_dir, dir, `${id}.jsonl`)
			const info = await stat(candidate).catch(() => null)
			if (info?.isFile()) {
				source_path = candidate
				source_project = dir
				break
			}
		}
	}

	if (!source_path || !source_project) {
		throw createError({ statusCode: 404, statusMessage: 'Session not found' })
	}

	// Create project subfolder in trash to preserve origin
	const trash_project_dir = safeJoin(trash_dir, source_project)
	await mkdir(trash_project_dir, { recursive: true })

	// Extract title before moving file
	const title = await extractSessionTitle(source_path).catch(() => '')

	// Write metadata so we know where to restore
	const meta_path = safeJoin(trash_project_dir, `${id}.meta.json`)
	await writeFile(meta_path, JSON.stringify({
		id,
		project: source_project,
		deleted_at: new Date().toISOString(),
		original_path: source_path,
		title: title || id,
	}), 'utf-8')

	// Move JSONL to trash
	const dest_path = safeJoin(trash_project_dir, `${id}.jsonl`)
	await rename(source_path, dest_path)

	return { ok: true }
})
