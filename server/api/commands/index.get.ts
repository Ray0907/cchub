import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('commands')
	let files: string[] = []
	try {
		const dirents = await readdir(path_dir)
		files = dirents.filter((f: string) => f.endsWith('.md'))
	}
	catch {
		return []
	}

	const list_commands = []
	for (const file of files) {
		const path_file = join(path_dir, file)
		try {
			const content_raw = await readFile(path_file, 'utf-8')
			const { data } = parseFrontmatter(content_raw)
			list_commands.push({
				name_command: (data.name as string) || file.replace(/\.md$/, ''),
				description: (data.description as string) || '',
				name_file: file,
				content_raw
			})
		}
		catch {
			// skip unreadable files
		}
	}

	return list_commands
})
