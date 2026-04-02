/**
 * Shorten a cwd path for display: replace /Users/x with ~ and truncate.
 */
export function formatCwd(cwd: string, maxLength = 35): string {
	const shortened = cwd.replace(/^\/Users\/[^/]+/, '~')
	if (shortened.length <= maxLength) return shortened
	return '...' + shortened.slice(-(maxLength - 3))
}

/**
 * Format an ISO timestamp as a human-readable relative time string.
 */
export function formatTimeAgo(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime()
	const minutes = Math.floor(diff / 60000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days < 7) return `${days}d ago`
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
