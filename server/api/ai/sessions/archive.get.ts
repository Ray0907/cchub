import { readdir, readFile, stat } from 'node:fs/promises'

interface ArchiveEntry {
	id: string
	title: string
	project: string
	deleted_at: string
}

export default defineApiHandler(async () => {
	const trash_dir = resolveClaudePath('trash')

	let project_dirs: string[]
	try {
		project_dirs = await readdir(trash_dir)
	}
	catch {
		return []
	}

	const list_items: ArchiveEntry[] = []

	for (const proj_dir of project_dirs) {
		const path_proj = safeJoin(trash_dir, proj_dir)
		const info = await stat(path_proj).catch(() => null)
		if (!info?.isDirectory()) continue

		let files: string[]
		try {
			files = await readdir(path_proj)
		}
		catch {
			continue
		}

		for (const file of files) {
			if (!file.endsWith('.meta.json')) continue

			const meta_path = safeJoin(path_proj, file)
			try {
				const raw = await readFile(meta_path, 'utf-8')
				const meta = JSON.parse(raw)

				let title = meta.title || meta.id
				if (!meta.title) {
					const jsonl_path = safeJoin(path_proj, `${meta.id}.jsonl`)
					title = await extractSessionTitle(jsonl_path).catch(() => '') || meta.id
				}

				list_items.push({
					id: meta.id,
					title,
					project: meta.project,
					deleted_at: meta.deleted_at,
				})
			}
			catch {
				continue
			}
		}
	}

	list_items.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at))
	return list_items
})
