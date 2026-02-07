import { readFile } from 'node:fs/promises'

async function readJsonSafe(path_file: string): Promise<Record<string, unknown> | null> {
	try {
		const raw = await readFile(path_file, 'utf-8')
		return JSON.parse(raw)
	}
	catch {
		return null
	}
}

export default defineApiHandler(async () => {
	const path_global = resolveClaudePath('settings.json')
	const path_local = resolveClaudePath('settings.local.json')

	const [settings_global, settings_local] = await Promise.all([
		readJsonSafe(path_global),
		readJsonSafe(path_local)
	])

	return {
		settings_global,
		settings_local
	}
})
