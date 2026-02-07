import { readdir, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'

interface UsageData {
	count_sessions: number
	count_messages: number
	tokens: {
		input: number
		output: number
		cache_create: number
		cache_read: number
	}
	list_daily: {
		date: string
		tokens_input: number
		tokens_output: number
		tokens_cache_read: number
	}[]
}

interface CacheEntry {
	data: UsageData
	time_created: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cache: CacheEntry | null = null

export default defineApiHandler(async () => {
	if (cache && Date.now() - cache.time_created < CACHE_TTL_MS) {
		return cache.data
	}

	const dir_projects = resolveClaudePath('projects')

	let list_project_dirs: string[] = []
	try {
		const entries = await readdir(dir_projects)
		list_project_dirs = entries.map(e => join(dir_projects, e))
	}
	catch {
		return emptyUsage()
	}

	let count_sessions = 0
	let count_messages = 0
	const tokens = { input: 0, output: 0, cache_create: 0, cache_read: 0 }
	const map_daily = new Map<string, { tokens_input: number; tokens_output: number; tokens_cache_read: number }>()

	const date_cutoff = new Date()
	date_cutoff.setDate(date_cutoff.getDate() - 30)
	const str_cutoff = date_cutoff.toISOString().slice(0, 10)

	for (const dir_project of list_project_dirs) {
		let list_files: string[] = []
		try {
			const entries = await readdir(dir_project)
			list_files = entries
				.filter(f => f.endsWith('.jsonl'))
				.map(f => join(dir_project, f))
		}
		catch {
			continue
		}

		for (const path_file of list_files) {
			const file_stat = await stat(path_file).catch(() => null)
			if (!file_stat) continue

			count_sessions++
			let has_usage = false

			const stream = createReadStream(path_file, { encoding: 'utf-8' })
			const reader = createInterface({ input: stream })

			try {
				for await (const line of reader) {
					if (!line.includes('"input_tokens"')) continue

					let entry: Record<string, unknown>
					try {
						entry = JSON.parse(line)
					}
					catch {
						continue
					}

					if (entry.type !== 'assistant') continue

					const message = entry.message as Record<string, unknown> | undefined
					if (!message) continue

					const usage = message.usage as Record<string, number> | undefined
					if (!usage?.input_tokens) continue

					has_usage = true
					count_messages++

					const val_input = usage.input_tokens ?? 0
					const val_output = usage.output_tokens ?? 0
					const val_cache_create = usage.cache_creation_input_tokens ?? 0
					const val_cache_read = usage.cache_read_input_tokens ?? 0

					tokens.input += val_input
					tokens.output += val_output
					tokens.cache_create += val_cache_create
					tokens.cache_read += val_cache_read

					const timestamp = entry.timestamp as string | undefined
					if (timestamp) {
						const date_str = timestamp.slice(0, 10)
						if (date_str >= str_cutoff) {
							const daily = map_daily.get(date_str) ?? { tokens_input: 0, tokens_output: 0, tokens_cache_read: 0 }
							daily.tokens_input += val_input
							daily.tokens_output += val_output
							daily.tokens_cache_read += val_cache_read
							map_daily.set(date_str, daily)
						}
					}
				}
			}
			catch {
				// stream error, skip file
			}

			if (!has_usage) {
				count_sessions--
			}
		}
	}

	const list_daily = Array.from(map_daily.entries())
		.map(([date, v]) => ({ date, ...v }))
		.sort((a, b) => a.date.localeCompare(b.date))

	const data: UsageData = {
		count_sessions,
		count_messages,
		tokens,
		list_daily,
	}

	cache = { data, time_created: Date.now() }

	return data
})

function emptyUsage(): UsageData {
	return {
		count_sessions: 0,
		count_messages: 0,
		tokens: { input: 0, output: 0, cache_create: 0, cache_read: 0 },
		list_daily: [],
	}
}
