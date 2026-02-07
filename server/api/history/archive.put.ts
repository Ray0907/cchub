import { appendFile, stat } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const { list_timestamps } = await readBody<{ list_timestamps: unknown }>(event)
	const list_valid = validateTimestamps(list_timestamps)

	return withFileLock('history-jsonl', async () => {
		const set_targets = new Set(list_valid)
		const path_history = resolveClaudePath('history.jsonl')
		const path_archive = resolveClaudePath('history-archived.jsonl')

		const file_stat = await stat(path_archive).catch(() => null)
		if (!file_stat) {
			throw createError({ statusCode: 404, statusMessage: 'Archive file not found' })
		}

		const list_keep: string[] = []
		const list_restored: string[] = []
		const list_entries = await readJsonlEntries(path_archive)

		for (const entry of list_entries) {
			if (set_targets.has(String(entry.timestamp))) {
				const { _deleted_at: _, ...rest } = entry
				list_restored.push(JSON.stringify(rest))
			}
			else {
				list_keep.push(JSON.stringify(entry))
			}
		}

		const content_keep = list_keep.length ? list_keep.join('\n') + '\n' : ''
		await writeFileAtomic(path_archive, content_keep)

		if (list_restored.length > 0) {
			await appendFile(path_history, list_restored.join('\n') + '\n', 'utf-8')
		}

		return { ok: true, count_restored: list_restored.length }
	})
})
