import { readFile } from 'node:fs/promises'

export default defineApiHandler(async () => {
	const path_file = resolveClaudePath('mcp.json')

	try {
		const raw = await readFile(path_file, 'utf-8')
		const parsed = JSON.parse(raw)
		return { servers: parsed.mcpServers || parsed.servers || {} }
	}
	catch {
		return { servers: {} }
	}
})
