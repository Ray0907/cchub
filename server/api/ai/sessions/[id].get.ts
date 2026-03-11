import { readFile, readdir } from 'node:fs/promises'

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
	const { cwd, messages } = parseSessionMessages(lines)

	return { id, cwd, messages }
})
