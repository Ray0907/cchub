import { resolve, join } from 'node:path'
import { homedir } from 'node:os'

export function getClaudeHome(): string {
	const config = useRuntimeConfig()
	const raw = config.claudeHomePath || '~/.claude/'
	const resolved = raw.startsWith('~')
		? join(homedir(), raw.slice(1))
		: resolve(raw)
	return resolved
}

export function resolveClaudePath(...segments: string[]): string {
	const base = getClaudeHome()
	const full = resolve(base, ...segments)
	assertPathSafe(full)
	return full
}
