import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createInterface } from 'node:readline'

interface JsonlOptions {
	filter_query?: string
	limit?: number
	offset?: number
}

interface JsonlResult {
	list_entries: Record<string, unknown>[]
	count_total: number
}

export async function readJsonlFile(
	path_file: string,
	options: JsonlOptions = {}
): Promise<JsonlResult> {
	const { filter_query, limit = 50, offset = 0 } = options

	const file_stat = await stat(path_file).catch(() => null)
	if (!file_stat) {
		return { list_entries: [], count_total: 0 }
	}

	const list_entries: Record<string, unknown>[] = []
	let count_total = 0
	let count_skipped = 0

	const stream = createReadStream(path_file, { encoding: 'utf-8' })
	const reader = createInterface({ input: stream })

	for await (const line of reader) {
		if (!line.trim()) continue

		let entry: Record<string, unknown>
		try {
			entry = JSON.parse(line)
		}
		catch {
			continue
		}

		if (filter_query) {
			const text = JSON.stringify(entry).toLowerCase()
			if (!text.includes(filter_query.toLowerCase())) continue
		}

		count_total++

		if (count_skipped < offset) {
			count_skipped++
			continue
		}

		if (list_entries.length < limit) {
			list_entries.push(entry)
		}
	}

	return { list_entries, count_total }
}
