import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('plans')
	let files: string[] = []
	try {
		const dirents = await readdir(path_dir)
		files = dirents.filter((f: string) => f.endsWith('.md'))
	}
	catch {
		return []
	}

	const list_plans = []
	for (const file of files) {
		const path_file = join(path_dir, file)
		try {
			const [content_raw, info] = await Promise.all([
				readFile(path_file, 'utf-8'),
				stat(path_file)
			])
			const { data } = parseFrontmatter(content_raw)
			list_plans.push({
				name_plan: (data.name as string) || file.replace(/\.md$/, ''),
				description: (data.description as string) || '',
				name_file: file,
				time_modified: info.mtime.toISOString()
			})
		}
		catch {
			// skip unreadable files
		}
	}

	list_plans.sort((a, b) => b.time_modified.localeCompare(a.time_modified))

	return list_plans
})
