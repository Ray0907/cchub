export default defineApiHandler(async (event) => {
	const query = getQuery(event)
	const filter_query = (query.q as string) || undefined
	const limit = Number(query.limit) || 50
	const offset = Number(query.offset) || 0

	const path_file = resolveClaudePath('history.jsonl')

	return await readJsonlFile(path_file, { filter_query, limit, offset })
})
