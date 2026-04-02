import { createSharedComposable } from '@vueuse/core'
import { onMounted, onScopeDispose, ref } from 'vue'

export interface McEvent {
	type: 'agent_start' | 'agent_end' | 'tool_start' | 'tool_end' | 'text_delta' | 'cost_update' | 'conflict_detected' | 'heartbeat'
	ts: string
	run_id: string
	agent_id: string
	tool_name?: string
	file_path?: string
	tokens_delta?: number
	cost_delta_usd?: number
	payload?: unknown
}

export interface ToolNode {
	tool_name: string
	status: 'running' | 'completed' | 'failed'
	start_ts: string
	end_ts?: string
	file_path?: string
	payload?: Record<string, unknown>
}

export interface AgentNode {
	agent_id: string
	run_id: string
	status: 'running' | 'completed' | 'stuck'
	start_ts: string
	last_event_ts: string
	tool_calls: ToolNode[]
	tokens_input: number
	tokens_output: number
	tokens_cache: number
	cost_usd: number
}

export interface ConflictEntry {
	file_path: string
	agents: string[]
	detected_at: string
}

export interface MissionControlSelection {
	node: AgentNode | ToolNode
	type: 'agent' | 'tool'
}

const DEFAULT_STUCK_AFTER_MS = 60_000
const CONNECTION_TTL_MS = 8_000
const MAX_EVENT_BUFFER = 10_000
const CONFLICT_HIDE_DELAY_MS = 10_000
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit'])

const _useMissionControl = () => {
	const agents = ref(new Map<string, AgentNode>())
	const conflicts = ref<ConflictEntry[]>([])
	const all_events = ref<McEvent[]>([])
	const is_connected = ref(false)
	const is_replaying = ref(false)
	const replay_index = ref(0)
	const selected_node = ref<MissionControlSelection | null>(null)
	const threshold_ms = ref(DEFAULT_STUCK_AFTER_MS)
	const ts_last_message = ref(0)

	const active_write_tools = new Map<string, Set<string>>()
	const map_conflict_timeouts = new Map<string, ReturnType<typeof setTimeout>>()
	let source: EventSource | null = null
	let id_healthcheck: ReturnType<typeof setInterval> | null = null
	let id_stuck_check: ReturnType<typeof setInterval> | null = null

	function connect(): void {
		if (import.meta.server || source) return

		source = new EventSource('/api/mission-control/stream')
		source.onopen = () => {
			is_connected.value = true
			ts_last_message.value = Date.now()
		}
		source.onerror = () => {
			is_connected.value = false
		}
		source.onmessage = (msg) => {
			ts_last_message.value = Date.now()
			is_connected.value = true

			let evt: McEvent
			try {
				evt = JSON.parse(msg.data) as McEvent
			} catch {
				return
			}

			applyEvent(evt)
		}

		id_healthcheck = setInterval(() => {
			if (Date.now() - ts_last_message.value > CONNECTION_TTL_MS) {
				is_connected.value = false
			}
		}, 1000)

		id_stuck_check = setInterval(refreshStatuses, 1000)
	}

	function disconnect(): void {
		source?.close()
		source = null
		is_connected.value = false

		if (id_healthcheck) clearInterval(id_healthcheck)
		if (id_stuck_check) clearInterval(id_stuck_check)
		id_healthcheck = null
		id_stuck_check = null

		for (const timeout_id of map_conflict_timeouts.values()) {
			clearTimeout(timeout_id)
		}
		map_conflict_timeouts.clear()
	}

	function applyEvent(evt: McEvent): void {
		pushEvent(evt)
		if (evt.type === 'heartbeat') return

		if (evt.type === 'tool_start') {
			handleToolStartConflict(evt)
		}

		if (evt.type === 'tool_end') {
			handleToolEndConflict(evt)
		}

		if (evt.type === 'agent_end') {
			handleAgentEndConflict(evt.agent_id)
		}

		agents.value = reduceMissionControlMap(agents.value, evt, {
			threshold_ms: threshold_ms.value,
			now_ms: Date.now()
		})

		refreshSelection()
	}

	function refreshStatuses(): void {
		const next_map = refreshMissionControlStatuses(agents.value, {
			threshold_ms: threshold_ms.value,
			now_ms: Date.now()
		})

		if (next_map !== agents.value) {
			agents.value = next_map
			refreshSelection()
		}
	}

	function pushEvent(evt: McEvent): void {
		const next_events = all_events.value.length >= MAX_EVENT_BUFFER
			? [...all_events.value.slice(1), evt]
			: [...all_events.value, evt]
		all_events.value = next_events

		if (!is_replaying.value) {
			replay_index.value = next_events.length
		} else if (replay_index.value > next_events.length) {
			replay_index.value = next_events.length
		}
	}

	function handleToolStartConflict(evt: McEvent): void {
		if (!evt.file_path || !evt.tool_name || !WRITE_TOOLS.has(evt.tool_name)) return

		const set_files = active_write_tools.get(evt.agent_id) ?? new Set<string>()
		set_files.add(evt.file_path)
		active_write_tools.set(evt.agent_id, set_files)

		const list_conflicting_agents = listActiveAgentsForPath(evt.file_path)
			.filter(agent_id => agent_id !== evt.agent_id)

		if (!list_conflicting_agents.length) return

		const agents_conflict = [...new Set([...list_conflicting_agents, evt.agent_id])].sort()
		const next_entry: ConflictEntry = {
			file_path: evt.file_path,
			agents: agents_conflict,
			detected_at: evt.ts
		}

		clearConflictTimeout(evt.file_path)
		upsertConflict(next_entry)
	}

	function handleToolEndConflict(evt: McEvent): void {
		if (!evt.file_path || !evt.tool_name || !WRITE_TOOLS.has(evt.tool_name)) return

		const set_files = active_write_tools.get(evt.agent_id)
		if (set_files) {
			set_files.delete(evt.file_path)
			if (!set_files.size) {
				active_write_tools.delete(evt.agent_id)
			}
		}

		scheduleConflictHide(evt.file_path)
	}

	function handleAgentEndConflict(agent_id: string): void {
		const set_files = active_write_tools.get(agent_id)
		if (!set_files) return

		const list_files = [...set_files]
		active_write_tools.delete(agent_id)

		for (const file_path of list_files) {
			scheduleConflictHide(file_path)
		}
	}

	function upsertConflict(entry: ConflictEntry): void {
		const index_conflict = conflicts.value.findIndex(conflict => conflict.file_path === entry.file_path)
		if (index_conflict < 0) {
			conflicts.value = [entry, ...conflicts.value]
			return
		}

		const next_conflicts = [...conflicts.value]
		next_conflicts[index_conflict] = entry
		conflicts.value = next_conflicts
	}

	function dismiss_conflict(file_path: string): void {
		clearConflictTimeout(file_path)
		conflicts.value = conflicts.value.filter(entry => entry.file_path !== file_path)
	}

	function clearConflictTimeout(file_path: string): void {
		const timeout_id = map_conflict_timeouts.get(file_path)
		if (!timeout_id) return
		clearTimeout(timeout_id)
		map_conflict_timeouts.delete(file_path)
	}

	function scheduleConflictHide(file_path: string): void {
		const conflict = conflicts.value.find(entry => entry.file_path === file_path)
		if (!conflict) return

		const has_active_participant = conflict.agents.some(agent_id =>
			active_write_tools.get(agent_id)?.has(file_path)
		)
		if (has_active_participant || map_conflict_timeouts.has(file_path)) return

		const timeout_id = setTimeout(() => {
			conflicts.value = conflicts.value.filter(entry => entry.file_path !== file_path)
			map_conflict_timeouts.delete(file_path)
		}, CONFLICT_HIDE_DELAY_MS)

		map_conflict_timeouts.set(file_path, timeout_id)
	}

	function listActiveAgentsForPath(file_path: string): string[] {
		const list_agents: string[] = []
		for (const [agent_id, set_files] of active_write_tools.entries()) {
			if (set_files.has(file_path)) {
				list_agents.push(agent_id)
			}
		}
		return list_agents
	}

	function select_agent(agent: AgentNode): void {
		selected_node.value = { node: agent, type: 'agent' }
	}

	function select_tool(tool: ToolNode): void {
		selected_node.value = { node: tool, type: 'tool' }
	}

	function clear_selection(): void {
		selected_node.value = null
	}

	function refreshSelection(): void {
		if (is_replaying.value) return

		const selection = selected_node.value
		if (!selection) return

		if (selection.type === 'agent') {
			const agent = selection.node as AgentNode
			const next_agent = agents.value.get(agent.agent_id)
			if (next_agent) {
				selected_node.value = { node: next_agent, type: 'agent' }
			}
			return
		}

		const next_tool = findToolInAgents(agents.value, selection.node as ToolNode)
		if (next_tool) {
			selected_node.value = { node: next_tool, type: 'tool' }
		}
	}

	onMounted(connect)
	onScopeDispose(disconnect)

	return {
		agents,
		conflicts,
		all_events,
		is_connected,
		is_replaying,
		replay_index,
		selected_node,
		threshold_ms,
		select_agent,
		select_tool,
		clear_selection,
		dismiss_conflict
	}
}

export const useMissionControl = createSharedComposable(_useMissionControl)

export function buildMissionControlSnapshot(
	list_events: McEvent[],
	options: { threshold_ms?: number, now_ms?: number } = {}
): Map<string, AgentNode> {
	let map_agents = new Map<string, AgentNode>()
	for (const evt of list_events) {
		if (evt.type === 'heartbeat') continue
		map_agents = reduceMissionControlMap(map_agents, evt, options)
	}
	return refreshMissionControlStatuses(map_agents, options)
}

function reduceMissionControlMap(
	map_agents: Map<string, AgentNode>,
	evt: McEvent,
	options: { threshold_ms?: number, now_ms?: number } = {}
): Map<string, AgentNode> {
	const next_map = new Map(map_agents)
	const current = next_map.get(evt.agent_id) ?? createAgent(evt)
	const next_agent: AgentNode = {
		...current,
		tool_calls: [...current.tool_calls],
		last_event_ts: evt.ts || current.last_event_ts
	}

	if (evt.type === 'agent_start') {
		next_agent.start_ts = current.start_ts || evt.ts
		next_agent.status = 'running'
	}

	if (evt.type === 'tool_start') {
		next_agent.status = 'running'
		next_agent.tool_calls.push({
			tool_name: evt.tool_name || 'Tool',
			status: 'running',
			start_ts: evt.ts,
			file_path: evt.file_path,
			payload: wrapToolInput(evt.payload)
		})
	}

	if (evt.type === 'tool_end') {
		next_agent.status = 'running'
		const index_tool = findRunningTool(next_agent.tool_calls, evt)
		if (index_tool >= 0) {
			const tool_prev = next_agent.tool_calls[index_tool]
			if (tool_prev) {
				next_agent.tool_calls[index_tool] = {
					...tool_prev,
					end_ts: evt.ts,
					status: isToolError(evt.payload) ? 'failed' : 'completed',
					payload: mergeToolPayload(tool_prev.payload, evt.payload)
				}
			}
		} else {
			next_agent.tool_calls.push({
				tool_name: evt.tool_name || 'Tool',
				status: isToolError(evt.payload) ? 'failed' : 'completed',
				start_ts: evt.ts,
				end_ts: evt.ts,
				file_path: evt.file_path,
				payload: mergeToolPayload(undefined, evt.payload)
			})
		}
	}

	if (evt.type === 'cost_update') {
		const usage = asRecord(evt.payload)
		next_agent.tokens_input += toNumber(usage.tokens_input)
		next_agent.tokens_output += toNumber(usage.tokens_output)
		next_agent.tokens_cache += toNumber(usage.tokens_cache_read) + toNumber(usage.tokens_cache_create)
		next_agent.cost_usd = roundMoney(next_agent.cost_usd + Number(evt.cost_delta_usd || 0))
	}

	if (evt.type === 'agent_end') {
		next_agent.status = 'completed'
		next_agent.tool_calls = next_agent.tool_calls.map(tool =>
			tool.status === 'running'
				? { ...tool, status: 'completed', end_ts: evt.ts }
				: tool
		)
	}

	next_agent.status = deriveStatus(next_agent, options)
	next_map.set(evt.agent_id, next_agent)
	return next_map
}

function refreshMissionControlStatuses(
	map_agents: Map<string, AgentNode>,
	options: { threshold_ms?: number, now_ms?: number } = {}
): Map<string, AgentNode> {
	const next_map = new Map<string, AgentNode>()
	let has_changes = false

	for (const [agent_id, agent] of map_agents.entries()) {
		const status_next = deriveStatus(agent, options)
		if (status_next !== agent.status) {
			has_changes = true
			next_map.set(agent_id, { ...agent, status: status_next, tool_calls: [...agent.tool_calls] })
			continue
		}
		next_map.set(agent_id, agent)
	}

	return has_changes ? next_map : map_agents
}

function createAgent(evt: McEvent): AgentNode {
	return {
		agent_id: evt.agent_id,
		run_id: evt.run_id,
		status: 'running',
		start_ts: evt.ts,
		last_event_ts: evt.ts,
		tool_calls: [],
		tokens_input: 0,
		tokens_output: 0,
		tokens_cache: 0,
		cost_usd: 0
	}
}

function findRunningTool(list_tools: ToolNode[], evt: McEvent): number {
	for (let i = list_tools.length - 1; i >= 0; i--) {
		const tool = list_tools[i]
		if (!tool) continue
		if (tool.status !== 'running') continue
		if (evt.tool_name && tool.tool_name === evt.tool_name && evt.file_path && tool.file_path === evt.file_path) return i
		if (evt.tool_name && tool.tool_name === evt.tool_name) return i
		if (evt.file_path && tool.file_path === evt.file_path) return i
		if (!evt.tool_name && !evt.file_path) return i
	}
	return -1
}

function findToolInAgents(map_agents: Map<string, AgentNode>, selected_tool: ToolNode): ToolNode | null {
	for (const agent of map_agents.values()) {
		const match = agent.tool_calls.find(tool =>
			tool.start_ts === selected_tool.start_ts
			&& tool.tool_name === selected_tool.tool_name
			&& tool.file_path === selected_tool.file_path
		)
		if (match) return match
	}
	return null
}

function deriveStatus(
	agent: AgentNode,
	options: { threshold_ms?: number, now_ms?: number } = {}
): AgentNode['status'] {
	if (agent.status === 'completed') return 'completed'
	const ts_last = Date.parse(agent.last_event_ts)
	const now_ms = options.now_ms ?? Date.now()
	const stale_after = options.threshold_ms ?? DEFAULT_STUCK_AFTER_MS
	if (!Number.isNaN(ts_last) && now_ms - ts_last > stale_after) {
		return 'stuck'
	}
	return 'running'
}

function wrapToolInput(payload: unknown): Record<string, unknown> | undefined {
	if (payload === undefined) return undefined
	return { input: payload }
}

function mergeToolPayload(previous: Record<string, unknown> | undefined, payload: unknown): Record<string, unknown> | undefined {
	if (payload === undefined) return previous

	const next_payload = asRecord(payload)
	if ('content' in next_payload || 'output' in next_payload || 'is_error' in next_payload) {
		return { ...(previous || {}), ...next_payload }
	}

	return { ...(previous || {}), output: payload }
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function toNumber(value: unknown): number {
	return typeof value === 'number' ? value : Number(value || 0)
}

function isToolError(payload: unknown): boolean {
	return Boolean(payload && typeof payload === 'object' && 'is_error' in payload && (payload as Record<string, unknown>).is_error)
}

function roundMoney(value: number): number {
	return Math.round(value * 10000) / 10000
}
