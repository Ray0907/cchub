<script setup lang="ts">
/* eslint-disable vue/prop-name-casing */
import type { AgentNode } from '~/composables/useMissionControl'

const props = defineProps<{
	agents: AgentNode[]
	is_connected: boolean
}>()

const count_agents = computed(() => props.agents.length)
const total_cost = computed(() => props.agents.reduce((sum, agent) => sum + agent.cost_usd, 0))
const total_tokens = computed(() => props.agents.reduce((sum, agent) => sum + agent.tokens_input + agent.tokens_output + agent.tokens_cache, 0))
const count_running = computed(() => props.agents.filter(agent => agent.status === 'running').length)
const count_stuck = computed(() => props.agents.filter(agent => agent.status === 'stuck').length)

const list_stats = computed(() => [
	{ key: 'agents', label: 'Agents', value: String(count_agents.value), icon: 'i-lucide-bot' },
	{ key: 'cost', label: 'Total Cost', value: `$${total_cost.value.toFixed(4)}`, icon: 'i-lucide-coins' },
	{ key: 'tokens', label: 'Total Tokens', value: formatNumber(total_tokens.value), icon: 'i-lucide-binary' },
	{ key: 'running', label: 'Running', value: String(count_running.value), icon: 'i-lucide-activity' },
	{ key: 'stuck', label: 'Stuck', value: String(count_stuck.value), icon: 'i-lucide-triangle-alert' }
])

const label_connection = computed(() => props.is_connected ? 'Live' : 'Reconnecting')
const class_connection = computed(() => props.is_connected ? 'bg-emerald-500' : 'bg-amber-500')

function formatNumber(value: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: value > 9999 ? 'compact' : 'standard',
		maximumFractionDigits: value > 9999 ? 1 : 0
	}).format(value)
}
</script>

<template>
	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
			<UCard v-for="item in list_stats" :key="item.key">
				<div class="flex items-center gap-3">
					<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
						<UIcon :name="item.icon" class="size-5 text-primary" />
					</div>
					<div>
						<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
							{{ item.label }}
						</p>
						<p class="text-2xl font-semibold tabular-nums">
							{{ item.value }}
						</p>
					</div>
				</div>
			</UCard>
		</div>

		<UCard>
			<div class="flex h-full items-center justify-between gap-3">
				<div>
					<p class="text-xs uppercase tracking-[0.2em] text-dimmed">
						Connection
					</p>
					<p class="mt-1 text-lg font-semibold">
						{{ label_connection }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<span class="size-3 rounded-full" :class="class_connection" />
					<span class="text-sm text-dimmed">{{ props.is_connected ? 'SSE active' : 'Awaiting events' }}</span>
				</div>
			</div>
		</UCard>
	</div>
</template>
