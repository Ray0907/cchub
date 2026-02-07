import { writeFile } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const { servers } = await readBody<{ servers: object }>(event)
	if (!servers || typeof servers !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Missing servers object' })
	}

	const path_file = resolveClaudePath('mcp.json')
	const path_backup = await createBackup(path_file)
	await writeFile(path_file, JSON.stringify({ mcpServers: servers }, null, 2) + '\n', 'utf-8')

	return { success: true }
})
