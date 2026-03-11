import { readdir, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'

interface SessionMetrics {
	id: string
	project: string
	title: string
	cwd: string
	time_start: string
	time_end: string
	duration_seconds: number
	tokens_input: number
	tokens_output: number
	tokens_cache_read: number
	tokens_cache_create: number
	count_turns: number
	count_tool_calls: number
	cost_usd: number
}

interface MonitoringData {
	sessions: SessionMetrics[]
	totals: {
		tokens_input: number
		tokens_output: number
		cost_usd: number
		count_sessions: number
		count_tool_calls: number
	}
}

// Claude Sonnet pricing (per million tokens)
const PRICE_INPUT_PER_M = 3.0
const PRICE_OUTPUT_PER_M = 15.0
const PRICE_CACHE_READ_PER_M = 0.3
const PRICE_CACHE_CREATE_PER_M = 3.75

function estimateCost(input: number, output: number, cache_read: number, cache_create: number): number {
	return (
		(input * PRICE_INPUT_PER_M / 1_000_000)
		+ (output * PRICE_OUTPUT_PER_M / 1_000_000)
		+ (cache_read * PRICE_CACHE_READ_PER_M / 1_000_000)
		+ (cache_create * PRICE_CACHE_CREATE_PER_M / 1_000_000)
	)
}

interface CacheEntry {
	data: MonitoringData
	time_created: number
}

const CACHE_TTL_MS = 3 * 60 * 1000
let cache: CacheEntry | null = null

export default defineApiHandler(async (event) => {
	const query = getQuery(event)
	const days = Math.min(Number(query.days) || 7, 90)
	const limit_count = Math.min(Number(query.limit) || 50, 200)

	if (cache && Date.now() - cache.time_created < CACHE_TTL_MS) {
		return cache.data
	}

	const dir_projects = resolveClaudePath('projects')
	let list_project_dirs: string[]
	try {
		const entries = await readdir(dir_projects)
		list_project_dirs = entries
	} catch {
		return emptyData()
	}

	const date_cutoff = new Date()
	date_cutoff.setDate(date_cutoff.getDate() - days)

	const sessions: SessionMetrics[] = []

	for (const dir_name of list_project_dirs) {
		const path_project = join(dir_projects, dir_name)
		const info_dir = await stat(path_project).catch(() => null)
		if (!info_dir?.isDirectory()) continue

		let files: string[]
		try {
			files = await readdir(path_project)
		} catch {
			continue
		}

		for (const file of files) {
			if (!file.endsWith('.jsonl')) continue

			const path_file = join(path_project, file)
			const info_file = await stat(path_file).catch(() => null)
			if (!info_file) continue

			// Skip files older than cutoff
			if (info_file.mtime < date_cutoff) continue

			const session_id = file.replace(/\.jsonl$/, '')
			const metrics = await extractSessionMetrics(path_file, session_id, dir_name)
			if (metrics && metrics.count_turns > 0) {
				sessions.push(metrics)
			}
		}
	}

	// Sort by most recent first
	sessions.sort((a, b) => b.time_end.localeCompare(a.time_end))

	const totals = {
		tokens_input: 0,
		tokens_output: 0,
		cost_usd: 0,
		count_sessions: sessions.length,
		count_tool_calls: 0
	}

	for (const s of sessions) {
		totals.tokens_input += s.tokens_input
		totals.tokens_output += s.tokens_output
		totals.cost_usd += s.cost_usd
		totals.count_tool_calls += s.count_tool_calls
	}

	totals.cost_usd = Math.round(totals.cost_usd * 10000) / 10000

	const data: MonitoringData = {
		sessions: sessions.slice(0, limit_count),
		totals
	}

	cache = { data, time_created: Date.now() }
	return data
})

async function extractSessionMetrics(
	path_file: string,
	session_id: string,
	project: string
): Promise<SessionMetrics | null> {
	let title = ''
	let cwd = ''
	let time_start = ''
	let time_end = ''
	let tokens_input = 0
	let tokens_output = 0
	let tokens_cache_read = 0
	let tokens_cache_create = 0
	let count_turns = 0
	let count_tool_calls = 0

	const stream = createReadStream(path_file, { encoding: 'utf-8' })
	const reader = createInterface({ input: stream })

	try {
		for await (const line of reader) {
			if (!line.trim()) continue

			let entry: Record<string, unknown>
			try {
				entry = JSON.parse(line)
			} catch {
				continue
			}

			const timestamp = entry.timestamp as string | undefined

			if (!cwd && typeof entry.cwd === 'string') {
				cwd = entry.cwd
			}

			if (timestamp) {
				if (!time_start) time_start = timestamp
				time_end = timestamp
			}

			if (entry.type === 'user' && !entry.isMeta) {
				const msg = entry.message as { role?: string, content?: unknown } | undefined
				if (msg?.role === 'user' && !title) {
					const text = extractTextContent(msg.content)
					if (text && text.length > 1 && !isSystemMessage(text)) {
						title = text.length > 80 ? text.slice(0, 80) + '...' : text
					}
				}
			}

			if (entry.type === 'assistant') {
				const msg = entry.message as Record<string, unknown> | undefined
				if (!msg) continue

				// Count tool calls
				if (Array.isArray(msg.content)) {
					for (const block of msg.content as Array<{ type: string }>) {
						if (block.type === 'tool_use') {
							count_tool_calls++
						}
					}
				}

				// Extract usage
				const usage = msg.usage as Record<string, number> | undefined
				if (usage?.input_tokens) {
					count_turns++
					tokens_input += usage.input_tokens ?? 0
					tokens_output += usage.output_tokens ?? 0
					tokens_cache_read += usage.cache_read_input_tokens ?? 0
					tokens_cache_create += usage.cache_creation_input_tokens ?? 0
				}
			}
		}
	} catch {
		// stream error
	} finally {
		stream.destroy()
	}

	if (count_turns === 0) return null

	const duration_seconds = time_start && time_end
		? Math.max(0, Math.round((new Date(time_end).getTime() - new Date(time_start).getTime()) / 1000))
		: 0

	return {
		id: session_id,
		project,
		title: title || session_id,
		cwd,
		time_start,
		time_end,
		duration_seconds,
		tokens_input,
		tokens_output,
		tokens_cache_read,
		tokens_cache_create,
		count_turns,
		count_tool_calls,
		cost_usd: Math.round(estimateCost(tokens_input, tokens_output, tokens_cache_read, tokens_cache_create) * 10000) / 10000
	}
}

function emptyData(): MonitoringData {
	return {
		sessions: [],
		totals: { tokens_input: 0, tokens_output: 0, cost_usd: 0, count_sessions: 0, count_tool_calls: 0 }
	}
}
