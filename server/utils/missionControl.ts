import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { McEvent } from '../../app/composables/useMissionControl'

const PRICE_INPUT_PER_M = 3
const PRICE_OUTPUT_PER_M = 15
const PRICE_CACHE_READ_PER_M = 0.3
const PRICE_CACHE_CREATE_PER_M = 3.75

interface ToolRef {
	tool_name?: string
	file_path?: string
	payload?: unknown
}

export interface MissionControlFileState {
	offset: number
	remainder: string
	has_started: boolean
	open_tools: Map<string, ToolRef>
}

type JsonObject = Record<string, unknown>

export async function listMissionControlJsonlFiles(dir_root: string): Promise<string[]> {
	const list_files: string[] = []
	const list_entries = await readdir(dir_root, { withFileTypes: true }).catch(() => [])

	for (const entry of list_entries) {
		const path_entry = join(dir_root, entry.name)
		if (entry.isDirectory()) {
			list_files.push(...await listMissionControlJsonlFiles(path_entry))
			continue
		}

		if (entry.isFile() && entry.name.endsWith('.jsonl')) {
			list_files.push(path_entry)
		}
	}

	return list_files.sort()
}

export async function readPendingMissionControlLines(
	path_file: string,
	state_file: MissionControlFileState
): Promise<string[]> {
	const info_file = await stat(path_file).catch(() => null)
	if (!info_file || !info_file.isFile()) return []

	if (info_file.size < state_file.offset) {
		state_file.offset = 0
		state_file.remainder = ''
		state_file.open_tools.clear()
		state_file.has_started = false
	}

	if (info_file.size === state_file.offset) return []

	let chunk_text = ''
	const stream = createReadStream(path_file, {
		encoding: 'utf-8',
		start: state_file.offset
	})

	for await (const chunk of stream) {
		chunk_text += chunk
	}

	state_file.offset = info_file.size

	const text_full = state_file.remainder + chunk_text
	const has_trailing_newline = text_full.endsWith('\n')
	const list_parts = text_full.split('\n')
	state_file.remainder = has_trailing_newline ? '' : list_parts.pop() ?? ''

	return list_parts
		.map(line => line.trim())
		.filter(Boolean)
}

export function normalizeMissionControlLine(
	line: string,
	path_file: string,
	dir_projects: string,
	state_file: MissionControlFileState
): McEvent[] {
	let entry: JsonObject
	try {
		entry = JSON.parse(line) as JsonObject
	} catch {
		return []
	}

	const project = relative(dir_projects, path_file).split('/')[0] || 'unknown'
	const run_id = relative(join(dir_projects, project), path_file).replace(/\.jsonl$/, '')
	const agent_id = `${project}:${run_id}`
	const ts = getTimestamp(entry)
	const list_events: McEvent[] = []
	const message = entry.message && typeof entry.message === 'object' ? entry.message as JsonObject : {}
	const list_content = Array.isArray(message.content) ? message.content : []

	if (!state_file.has_started) {
		state_file.has_started = true
		list_events.push({ type: 'agent_start', ts, run_id, agent_id, payload: pickAgentPayload(entry) })
	}

	if (entry.type === 'assistant') {
		for (const block of list_content) {
			if (block?.type === 'tool_use') {
				const tool_name = block.name || block.tool_name || 'Tool'
				const file_path = extractFilePath(tool_name, block.input)
				const tool_id = String(block.id || block.tool_use_id || '')
				if (tool_id) {
					state_file.open_tools.set(tool_id, { tool_name, file_path, payload: block.input })
				}
				list_events.push({
					type: 'tool_start',
					ts,
					run_id,
					agent_id,
					tool_name,
					file_path,
					payload: block.input
				})
				continue
			}

			if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
				list_events.push({
					type: 'text_delta',
					ts,
					run_id,
					agent_id,
					payload: { text: block.text }
				})
			}
		}
	}

	if (entry.type === 'tool') {
		const tool_name = entry.tool_name || entry.name || entry.toolName
		const file_path = extractFilePath(tool_name, entry.input || entry.payload)
		list_events.push({
			type: 'tool_end',
			ts,
			run_id,
			agent_id,
			tool_name,
			file_path,
			payload: clipPayload(entry.output || entry.payload || entry)
		})
	}

	if (entry.type === 'user' && Array.isArray(list_content)) {
		for (const block of list_content) {
			if (block?.type !== 'tool_result') continue
			const ref_tool = state_file.open_tools.get(String(block.tool_use_id || ''))
			if (block.tool_use_id) {
				state_file.open_tools.delete(String(block.tool_use_id))
			}
			list_events.push({
				type: 'tool_end',
				ts,
				run_id,
				agent_id,
				tool_name: ref_tool?.tool_name,
				file_path: ref_tool?.file_path,
				payload: { content: clipPayload(block.content), is_error: Boolean(block.is_error) }
			})
		}
	}

	if (entry.type === 'result') {
		list_events.push({
			type: 'agent_end',
			ts,
			run_id,
			agent_id,
			payload: clipPayload(entry.result || entry)
		})
	}

	const usage = message.usage && typeof message.usage === 'object' ? message.usage : entry.usage
	const evt_cost = buildCostEvent(usage, ts, run_id, agent_id)
	if (evt_cost) {
		list_events.push(evt_cost)
	}

	return list_events
}

function buildCostEvent(usage: JsonObject | undefined, ts: string, run_id: string, agent_id: string): McEvent | null {
	if (!usage) return null

	const tokens_input = Number(usage.input_tokens || 0)
	const tokens_output = Number(usage.output_tokens || 0)
	const tokens_cache_read = Number(usage.cache_read_input_tokens || 0)
	const tokens_cache_create = Number(usage.cache_creation_input_tokens || 0)
	const tokens_delta = tokens_input + tokens_output + tokens_cache_read + tokens_cache_create

	if (!tokens_delta) return null

	const cost_delta_usd = (
		(tokens_input * PRICE_INPUT_PER_M / 1_000_000)
		+ (tokens_output * PRICE_OUTPUT_PER_M / 1_000_000)
		+ (tokens_cache_read * PRICE_CACHE_READ_PER_M / 1_000_000)
		+ (tokens_cache_create * PRICE_CACHE_CREATE_PER_M / 1_000_000)
	)

	return {
		type: 'cost_update',
		ts,
		run_id,
		agent_id,
		tokens_delta,
		cost_delta_usd,
		payload: { tokens_input, tokens_output, tokens_cache_read, tokens_cache_create }
	}
}

function extractFilePath(tool_name?: string, input?: unknown): string | undefined {
	if (!tool_name || !input || typeof input !== 'object') return undefined
	if (!['Write', 'Edit', 'MultiEdit'].includes(tool_name)) return undefined

	const values = input as JsonObject
	return asString(values.file_path) || asString(values.path) || asString(values.target_file) || asString(values.filePath) || undefined
}

function getTimestamp(entry: JsonObject): string {
	return asString(entry.timestamp) || new Date().toISOString()
}

function pickAgentPayload(entry: JsonObject): Record<string, unknown> {
	return {
		session_id: entry.session_id || entry.sessionId,
		cwd: entry.cwd,
		agentId: entry.agentId,
		slug: entry.slug
	}
}

function clipPayload(value: unknown): unknown {
	if (typeof value === 'string') {
		return value.length > 4000 ? value.slice(0, 4000) : value
	}
	return value
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined
}
