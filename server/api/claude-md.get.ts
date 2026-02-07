import { readFile } from 'node:fs/promises'

export default defineApiHandler(async () => {
	const path_file = resolveClaudePath('CLAUDE.md')

	const content_raw = await readFile(path_file, 'utf-8').catch(() => null)
	if (!content_raw) {
		return { content_raw: '' }
	}

	return { content_raw }
})
