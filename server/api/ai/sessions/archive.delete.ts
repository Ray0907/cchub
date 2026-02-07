import { readdir, unlink, rm, stat } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const body = await readBody(event)
	const id = body?.id as string
	const project = body?.project as string

	const trash_dir = resolveClaudePath('trash')

	if (id && project) {
		// Validate path segments
		assertSafeSegment(id, 'session ID')
		assertSafeSegment(project, 'project')

		// Delete one specific session from trash
		const meta_path = safeJoin(trash_dir, project, `${id}.meta.json`)
		const jsonl_path = safeJoin(trash_dir, project, `${id}.jsonl`)
		await unlink(meta_path).catch(() => {})
		await unlink(jsonl_path).catch(() => {})
		return { ok: true }
	}

	// Empty entire trash — only delete subdirectories within trash_dir
	try {
		const project_dirs = await readdir(trash_dir)
		for (const dir of project_dirs) {
			const path_dir = safeJoin(trash_dir, dir)
			const info = await stat(path_dir).catch(() => null)
			if (info?.isDirectory()) {
				await rm(path_dir, { recursive: true, force: true })
			}
		}
	}
	catch {
		// Trash dir might not exist
	}

	return { ok: true }
})
