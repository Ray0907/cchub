<script setup lang="ts">
import type { AgentNode } from '~/composables/useMissionControl'

const props = defineProps<{
	agent: AgentNode
}>()

const ts_now = ref(Date.now())
let id_tick: ReturnType<typeof setInterval> | null = null

const tool_last = computed(() => props.agent.tool_calls.at(-1))
const count_tokens = computed(() => props.agent.tokens_input + props.agent.tokens_output + props.agent.tokens_cache)
const label_status = computed(() => props.agent.status)
const class_status = computed(() => {
	if (props.agent.status === 'completed') return 'text-dimmed'
	if (props.agent.status === 'stuck') return 'text-amber-500'
	return 'text-emerald-500'
})

onMounted(() => {
	id_tick = setInterval(() => {
		ts_now.value = Date.now()
	}, 1000)
})

onBeforeUnmount(() => {
	if (id_tick) clearInterval(id_tick)
})

function shortenAgentId(value: string): string {
	if (value.length <= 22) return value
	return `${value.slice(0, 12)}...${value.slice(-7)}`
}

function formatTokens(value: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: value > 9999 ? 'compact' : 'standard',
		maximumFractionDigits: value > 9999 ? 1 : 0
	}).format(value)
}

function formatElapsed(start_ts: string): string {
	const ms = Math.max(0, ts_now.value - Date.parse(start_ts))
	const seconds = Math.floor(ms / 1000)
	if (seconds < 60) return `${seconds}s`
	const minutes = Math.floor(seconds / 60)
	const rem_seconds = seconds % 60
	if (minutes < 60) return `${minutes}m ${rem_seconds}s`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ${minutes % 60}m`
}
</script>

<template>
	<UCard class="h-full">
		<div class="flex h-full flex-col gap-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="text-[11px] uppercase tracking-[0.2em] text-dimmed">
						Agent
					</p>
					<p class="truncate font-mono text-sm" :title="props.agent.agent_id">
						{{ shortenAgentId(props.agent.agent_id) }}
					</p>
				</div>
				<UBadge
					color="neutral"
					variant="subtle"
					size="sm"
					class="capitalize shrink-0"
					:class="class_status"
				>
					{{ label_status }}
				</UBadge>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<p class="text-[11px] uppercase tracking-[0.2em] text-dimmed">
						Last Tool
					</p>
					<p class="truncate text-sm">
						{{ tool_last?.tool_name || 'Idle' }}
					</p>
					<p v-if="tool_last?.file_path" class="truncate text-xs text-dimmed" :title="tool_last.file_path">
						{{ tool_last.file_path }}
					</p>
				</div>

				<div class="text-right">
					<p class="text-[11px] uppercase tracking-[0.2em] text-dimmed">
						Elapsed
					</p>
					<p class="text-sm tabular-nums">
						{{ formatElapsed(props.agent.start_ts) }}
					</p>
				</div>
			</div>

			<div class="mt-auto grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg bg-elevated/60 p-3">
					<p class="text-[11px] uppercase tracking-[0.2em] text-dimmed">
						Cost
					</p>
					<p class="mt-1 text-lg font-semibold tabular-nums">
						${{ props.agent.cost_usd.toFixed(4) }}
					</p>
				</div>

				<div class="rounded-lg bg-elevated/60 p-3">
					<p class="text-[11px] uppercase tracking-[0.2em] text-dimmed">
						Tokens
					</p>
					<p class="mt-1 text-lg font-semibold tabular-nums">
						{{ formatTokens(count_tokens) }}
					</p>
					<p class="text-xs text-dimmed">
						{{ formatTokens(props.agent.tokens_input) }} in / {{ formatTokens(props.agent.tokens_output) }} out / {{ formatTokens(props.agent.tokens_cache) }} cache
					</p>
				</div>
			</div>
		</div>
	</UCard>
</template>
