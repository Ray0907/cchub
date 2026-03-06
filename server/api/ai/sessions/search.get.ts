export default defineApiHandler(async (event) => {
	const query = getQuery(event)
	const q = ((query.q as string) || '').trim()
	const project = (query.project as string) || ''
	const limit = Math.min(Number(query.limit) || 20, 100)

	if (!q || q.length < 2) {
		return { results: [], query: q }
	}

	ensureIndexFresh()

	const results = searchMessages(q, { limit, project: project || undefined })

	return { results, query: q }
})
