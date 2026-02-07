import { resolve, join } from 'node:path'
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

/**
 * Join paths and validate the result stays within ~/.claude/.
 * Use this instead of `join()` when any segment comes from user input.
 */
export function safeJoin(base: string, ...segments: string[]): string {
	const full = resolve(base, ...segments)
	assertPathSafe(full)
	return full
}

/**
 * Validate that a path segment (id, project name) contains no traversal characters.
 * Rejects `/`, `\`, `..`, and null bytes.
 */
export function assertSafeSegment(value: string, label: string): void {
	if (!value || /[/\\]|\.\.|\0/.test(value)) {
		throw createError({
			statusCode: 400,
			statusMessage: `Invalid ${label}`
		})
	}
}
