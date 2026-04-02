<script setup lang="ts">
import type { AgentNode, ToolNode } from '~/composables/useMissionControl'

const props = defineProps<{
	agents: AgentNode[]
}>()

const emit = defineEmits<{
	'select-agent': [agent: AgentNode]
	'select-tool': [tool: ToolNode]
}>()

const map_open = reactive<Record<string, boolean>>({})
const ts_now = ref(Date.now())
let id_tick: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	id_tick = setInterval(() => {
		ts_now.value = Date.now()
	}, 1000)
})

onBeforeUnmount(() => {
	if (id_tick) clearInterval(id_tick)
})

watch(() => props.agents, (agents) => {
	for (const agent of agents) {
		if (map_open[agent.agent_id] === undefined) {
			map_open[agent.agent_id] = true
		}
	}
}, { immediate: true })

function toggle(agent_id: string): void {
	map_open[agent_id] = !map_open[agent_id]
}

function on_select_agent(agent: AgentNode): void {
	emit('select-agent', agent)
}

function on_select_tool(tool: ToolNode): void {
	emit('select-tool', tool)
}

function formatDuration(start_ts: string, end_ts?: string): string {
	const ts_start = Date.parse(start_ts)
	const ts_end = end_ts ? Date.parse(end_ts) : ts_now.value
	const seconds = Math.max(0, Math.floor((ts_end - ts_start) / 1000))
	if (seconds < 60) return `${seconds}s`
	const minutes = Math.floor(seconds / 60)
	const rem_seconds = seconds % 60
	if (minutes < 60) return `${minutes}m ${rem_seconds}s`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ${minutes % 60}m`
}

function iconAgent(agent: AgentNode): string {
	if (agent.status === 'completed') return 'i-lucide-circle-check-big'
	if (agent.status === 'stuck') return 'i-lucide-triangle-alert'
	return 'i-lucide-loader-circle'
}

function iconTool(tool: ToolNode): string {
	if (tool.status === 'completed') return 'i-lucide-circle-check-big'
	if (tool.status === 'failed') return 'i-lucide-circle-x'
	return 'i-lucide-wrench'
}

function classStatus(status: string): string {
	if (status === 'completed') return 'text-emerald-500'
	if (status === 'failed' || status === 'stuck') return 'text-amber-500'
	return 'text-primary'
}

function labelAgent(agent: AgentNode): string {
	const segments = agent.agent_id.split(':')
	return segments.at(-1) || agent.agent_id
}
</script>

<template>
	<UCard>
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<div>
					<h2 class="text-sm font-medium text-dimmed">
						Task Tree
					</h2>
					<p class="text-xs text-dimmed/70">
						Agents and their live tool calls
					</p>
				</div>
				<UBadge color="neutral" variant="subtle" size="sm">
					{{ props.agents.length }} agents
				</UBadge>
			</div>
		</template>

		<div v-if="props.agents.length" class="space-y-3">
			<div
				v-for="agent in props.agents"
				:key="agent.agent_id"
				class="rounded-xl border border-default/60 bg-elevated/20"
			>
				<div class="flex items-center gap-3 px-4 py-3">
					<button
						type="button"
						class="rounded-lg p-1.5 text-dimmed transition hover:bg-elevated hover:text-highlighted"
						@click="toggle(agent.agent_id)"
					>
						<UIcon :name="map_open[agent.agent_id] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
					</button>
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-3 text-left"
						@click="on_select_agent(agent)"
					>
						<UIcon :name="iconAgent(agent)" class="size-4 shrink-0" :class="classStatus(agent.status)" />
						<div class="min-w-0 flex-1">
							<p class="truncate font-mono text-sm">
								{{ labelAgent(agent) }}
							</p>
							<p class="text-xs text-dimmed">
								{{ agent.status }} · {{ formatDuration(agent.start_ts, agent.status === 'completed' ? agent.last_event_ts : undefined) }}
							</p>
						</div>
						<UBadge color="neutral" variant="subtle" size="xs">
							{{ agent.tool_calls.length }} tools
						</UBadge>
					</button>
				</div>

				<div v-if="map_open[agent.agent_id]" class="border-t border-default/60 px-4 py-3">
					<div v-if="agent.tool_calls.length" class="space-y-2">
						<button
							v-for="(tool, index_tool) in agent.tool_calls"
							:key="`${agent.agent_id}:${index_tool}:${tool.start_ts}`"
							type="button"
							class="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-elevated/40"
							@click="on_select_tool(tool)"
						>
							<div class="flex w-4 justify-center">
								<span class="mt-1 h-full w-px bg-default/70" />
							</div>
							<UIcon :name="iconTool(tool)" class="mt-0.5 size-4 shrink-0" :class="classStatus(tool.status)" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm">
									{{ tool.tool_name }}
								</p>
								<p class="text-xs text-dimmed">
									{{ tool.status }} · {{ formatDuration(tool.start_ts, tool.end_ts) }}
								</p>
								<p v-if="tool.file_path" class="truncate text-xs text-dimmed/80" :title="tool.file_path">
									{{ tool.file_path }}
								</p>
							</div>
						</button>
					</div>

					<div v-else class="rounded-lg border border-dashed border-default/70 px-4 py-5 text-center text-sm text-dimmed">
						No tool calls yet
					</div>
				</div>
			</div>
		</div>

		<div v-else class="rounded-xl border border-dashed border-default/70 px-6 py-10 text-center">
			<UIcon name="i-lucide-radar" class="mx-auto mb-3 size-10 text-dimmed/40" />
			<p class="text-sm text-dimmed">
				No agents streaming yet
			</p>
			<p class="text-xs text-dimmed/70">
				Open Claude Code and start a run to populate the task tree
			</p>
		</div>
	</UCard>
</template>
