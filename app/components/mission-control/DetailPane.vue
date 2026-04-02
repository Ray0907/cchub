<script setup lang="ts">
import type { AgentNode, ToolNode } from '~/composables/useMissionControl'

const props = defineProps<{
	node: AgentNode | ToolNode | null
	type: 'agent' | 'tool' | null
}>()

const emit = defineEmits<{
	close: []
}>()

const ts_now = ref(Date.now())
let id_tick: ReturnType<typeof setInterval> | null = null

const agent_node = computed(() => props.type === 'agent' ? props.node as AgentNode : null)
const tool_node = computed(() => props.type === 'tool' ? props.node as ToolNode : null)
const tool_payload = computed(() => tool_node.value?.payload || {})
const tool_input = computed(() => formatJson(tool_payload.value.input))
const tool_output = computed(() => {
	const value = tool_payload.value.content ?? tool_payload.value.output
	return truncateText(formatUnknown(value), 2000)
})

onMounted(() => {
	id_tick = setInterval(() => {
		ts_now.value = Date.now()
	}, 1000)
	window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
	if (id_tick) clearInterval(id_tick)
	window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(event: KeyboardEvent): void {
	if (event.key === 'Escape' && props.node) {
		emit('close')
	}
}

function formatTimestamp(value: string): string {
	const ts = Date.parse(value)
	if (Number.isNaN(ts)) return value
	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'medium'
	}).format(ts)
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

function formatNumber(value: number): string {
	return new Intl.NumberFormat('en-US').format(value)
}

function formatJson(value: unknown): string {
	if (value === undefined) return ''
	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return String(value)
	}
}

function formatUnknown(value: unknown): string {
	if (value === undefined) return ''
	if (typeof value === 'string') return value
	if (Array.isArray(value) || typeof value === 'object') {
		return formatJson(value)
	}
	return String(value)
}

function truncateText(value: string, limit: number): string {
	if (value.length <= limit) return value
	return `${value.slice(0, limit)}\n\n...[truncated]`
}
</script>

<template>
	<Transition
		enter-active-class="transition duration-200 ease-out"
		enter-from-class="translate-x-full opacity-0"
		enter-to-class="translate-x-0 opacity-100"
		leave-active-class="transition duration-150 ease-in"
		leave-from-class="translate-x-0 opacity-100"
		leave-to-class="translate-x-full opacity-0"
	>
		<div v-if="props.node && props.type" class="fixed inset-0 z-40 flex justify-end">
			<button
				type="button"
				class="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
				@click="emit('close')"
			/>

			<aside class="relative h-full w-full max-w-xl overflow-y-auto border-l border-default bg-default shadow-2xl">
				<div class="sticky top-0 z-10 flex items-center justify-between border-b border-default bg-default/95 px-5 py-4 backdrop-blur">
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
							{{ props.type === 'agent' ? 'Agent Detail' : 'Tool Detail' }}
						</p>
						<p class="text-lg font-semibold text-highlighted">
							{{ props.type === 'agent' ? agent_node?.agent_id : tool_node?.tool_name }}
						</p>
					</div>

					<button
						type="button"
						class="rounded-lg p-2 text-dimmed transition hover:bg-elevated/70 hover:text-highlighted"
						@click="emit('close')"
					>
						<span class="sr-only">Close detail pane</span>
						<UIcon name="i-lucide-x" class="size-5" />
					</button>
				</div>

				<div class="space-y-6 p-5">
					<template v-if="agent_node">
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="rounded-xl bg-elevated/50 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Status
								</p>
								<p class="mt-2 text-lg font-semibold capitalize">
									{{ agent_node.status }}
								</p>
							</div>
							<div class="rounded-xl bg-elevated/50 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Duration
								</p>
								<p class="mt-2 text-lg font-semibold">
									{{ formatDuration(agent_node.start_ts, agent_node.status === 'completed' ? agent_node.last_event_ts : undefined) }}
								</p>
							</div>
						</div>

						<div class="space-y-3">
							<div>
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Agent ID
								</p>
								<p class="mt-1 break-all font-mono text-sm">
									{{ agent_node.agent_id }}
								</p>
							</div>
							<div>
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Start Time
								</p>
								<p class="mt-1 text-sm">
									{{ formatTimestamp(agent_node.start_ts) }}
								</p>
							</div>
						</div>

						<div class="grid gap-3 sm:grid-cols-3">
							<div class="rounded-xl border border-default/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Input
								</p>
								<p class="mt-2 text-lg font-semibold tabular-nums">
									{{ formatNumber(agent_node.tokens_input) }}
								</p>
							</div>
							<div class="rounded-xl border border-default/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Output
								</p>
								<p class="mt-2 text-lg font-semibold tabular-nums">
									{{ formatNumber(agent_node.tokens_output) }}
								</p>
							</div>
							<div class="rounded-xl border border-default/70 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Cache
								</p>
								<p class="mt-2 text-lg font-semibold tabular-nums">
									{{ formatNumber(agent_node.tokens_cache) }}
								</p>
							</div>
						</div>

						<div class="rounded-2xl bg-primary/6 p-4">
							<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
								Cost
							</p>
							<p class="mt-2 text-3xl font-semibold tabular-nums text-highlighted">
								${{ agent_node.cost_usd.toFixed(4) }}
							</p>
						</div>
					</template>

					<template v-else-if="tool_node">
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="rounded-xl bg-elevated/50 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Status
								</p>
								<p class="mt-2 text-lg font-semibold capitalize">
									{{ tool_node.status }}
								</p>
							</div>
							<div class="rounded-xl bg-elevated/50 p-4">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Duration
								</p>
								<p class="mt-2 text-lg font-semibold">
									{{ formatDuration(tool_node.start_ts, tool_node.end_ts) }}
								</p>
							</div>
						</div>

						<div class="space-y-3">
							<div v-if="tool_node.file_path">
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									File Path
								</p>
								<p class="mt-1 break-all font-mono text-sm">
									{{ tool_node.file_path }}
								</p>
							</div>

							<div>
								<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
									Started
								</p>
								<p class="mt-1 text-sm">
									{{ formatTimestamp(tool_node.start_ts) }}
								</p>
							</div>
						</div>

						<div v-if="tool_input" class="space-y-2">
							<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
								Payload Input
							</p>
							<pre class="overflow-x-auto rounded-2xl bg-black/90 p-4 text-xs leading-6 text-emerald-300">{{ tool_input }}</pre>
						</div>

						<div v-if="tool_output" class="space-y-2">
							<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
								Output
							</p>
							<pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-elevated/60 p-4 text-xs leading-6 text-highlighted">{{ tool_output }}</pre>
						</div>
					</template>
				</div>
			</aside>
		</div>
	</Transition>
</template>
