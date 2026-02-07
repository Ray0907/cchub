import { appendFile, stat } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const { list_timestamps } = await readBody<{ list_timestamps: unknown }>(event)
	const list_valid = validateTimestamps(list_timestamps)

	return withFileLock('history-jsonl', async () => {
		const set_targets = new Set(list_valid)
		const path_history = resolveClaudePath('history.jsonl')
		const path_archive = resolveClaudePath('history-archived.jsonl')

		const file_stat = await stat(path_history).catch(() => null)
		if (!file_stat) {
			throw createError({ statusCode: 404, statusMessage: 'History file not found' })
		}

		const list_keep: string[] = []
		const list_archived: string[] = []
		const time_deleted = new Date().toISOString()
		const list_entries = await readJsonlEntries(path_history)

		for (const entry of list_entries) {
			if (set_targets.has(String(entry.timestamp))) {
				list_archived.push(JSON.stringify({ ...entry, _deleted_at: time_deleted }))
			}
			else {
				list_keep.push(JSON.stringify(entry))
			}
		}

		const content_keep = list_keep.length ? list_keep.join('\n') + '\n' : ''
		await writeFileAtomic(path_history, content_keep)

		if (list_archived.length > 0) {
			await appendFile(path_archive, list_archived.join('\n') + '\n', 'utf-8')
		}

		return { ok: true, count_archived: list_archived.length }
	})
})
