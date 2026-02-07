export default defineApiHandler(async () => {
	const path_file = resolveClaudePath('history-archived.jsonl')
	const list_entries = await readJsonlEntries(path_file)

	list_entries.sort((a, b) => {
		const ta = String(a._deleted_at || '')
		const tb = String(b._deleted_at || '')
		return tb.localeCompare(ta)
	})

	return list_entries
})
