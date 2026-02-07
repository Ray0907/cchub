import { rename, readFile, mkdir, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'

export default defineApiHandler(async (event) => {
	const body = await readBody(event)
	const id = body?.id as string
	const project = body?.project as string

	if (!id || !project) {
		throw createError({ statusCode: 400, statusMessage: 'Missing id or project' })
	}
	assertSafeSegment(id, 'session ID')
	assertSafeSegment(project, 'project')

	const trash_dir = resolveClaudePath('trash')
	const meta_path = safeJoin(trash_dir, project, `${id}.meta.json`)
	const jsonl_path = safeJoin(trash_dir, project, `${id}.jsonl`)

	let meta: { original_path: string }
	try {
		const raw = await readFile(meta_path, 'utf-8')
		meta = JSON.parse(raw)
	}
	catch {
		throw createError({ statusCode: 404, statusMessage: 'Archived session not found' })
	}

	// CRITICAL: Validate that original_path is within ~/.claude/
	assertPathSafe(meta.original_path)

	// Ensure the original directory exists
	await mkdir(dirname(meta.original_path), { recursive: true })

	// Move .jsonl back to original location
	await rename(jsonl_path, meta.original_path)

	// Remove meta file
	await unlink(meta_path)

	return { ok: true }
})
