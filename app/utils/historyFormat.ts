export function formatHistoryTimeAgo(ts: unknown): string {
	if (typeof ts !== 'number' && typeof ts !== 'string') return '-'
	const diff = Date.now() - new Date(ts).getTime()
	const minutes = Math.floor(diff / 60000)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days < 30) return `${days}d ago`
	return new Date(ts).toLocaleDateString('en-US')
}

export function extractMessage(row: Record<string, unknown>): string {
	if (typeof row.display === 'string' && row.display) return row.display
	if (typeof row.message === 'string' && row.message) return row.message
	return JSON.stringify(row).slice(0, 200)
}
