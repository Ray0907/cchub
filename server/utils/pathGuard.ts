import { resolve } from 'node:path'
import { createError } from 'h3'

export function assertPathSafe(path_target: string): void {
	const base = getClaudeHome()
	const resolved = resolve(path_target)
	if (!resolved.startsWith(base)) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Path traversal denied'
		})
	}
}
