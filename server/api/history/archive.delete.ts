import { stat, unlink } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const body = await readBody<{
		list_timestamps?: unknown
		delete_all?: boolean
	}>(event).catch(() => null)

	const is_delete_all = body?.delete_all === true
	const list_timestamps = body?.list_timestamps

	if (!is_delete_all && (!Array.isArray(list_timestamps) || list_timestamps.length === 0)) {
		throw createError({ statusCode: 400, statusMessage: 'Provide list_timestamps or delete_all: true' })
	}

	return withFileLock('history-jsonl', async () => {
		const path_archive = resolveClaudePath('history-archived.jsonl')

		const file_stat = await stat(path_archive).catch(() => null)
		if (!file_stat) return { ok: true }

		if (is_delete_all) {
			await unlink(path_archive).catch(() => {})
			return { ok: true }
		}

		const list_valid = validateTimestamps(list_timestamps)
		const set_targets = new Set(list_valid)
		const list_entries = await readJsonlEntries(path_archive)

		const list_keep = list_entries
			.filter(entry => !set_targets.has(String(entry.timestamp)))
			.map(entry => JSON.stringify(entry))

		const content_keep = list_keep.length ? list_keep.join('\n') + '\n' : ''
		await writeFileAtomic(path_archive, content_keep)

		return { ok: true }
	})
})
