<script setup lang="ts">
useSeoMeta({ title: 'Monitoring' })

const { resumeSession } = useAiChat()

const filter_days = ref(7)
const is_loading_session = ref(false)

const url_params = computed(() => ({
	days: filter_days.value,
	limit: 100
}))

const { data, status } = useFetch('/api/monitoring', {
	query: url_params,
	watch: [url_params],
	default: () => ({
		sessions: [] as Array<Record<string, unknown>>,
		totals: { tokens_input: 0, tokens_output: 0, cost_usd: 0, count_sessions: 0, count_tool_calls: 0 }
	})
})

const list_sessions = computed(() => data.value?.sessions ?? [])
const totals = computed(() => data.value?.totals ?? { tokens_input: 0, tokens_output: 0, cost_usd: 0, count_sessions: 0, count_tool_calls: 0 })

const list_stats = computed(() => [
	{ key: 'sessions', label: 'Sessions', value: String(totals.value.count_sessions), icon: 'i-lucide-layers' },
	{ key: 'input', label: 'Input Tokens', value: formatCompact(totals.value.tokens_input), icon: 'i-lucide-arrow-down-to-line' },
	{ key: 'output', label: 'Output Tokens', value: formatCompact(totals.value.tokens_output), icon: 'i-lucide-arrow-up-from-line' },
	{ key: 'cost', label: 'Est. Cost', value: `$${totals.value.cost_usd.toFixed(2)}`, icon: 'i-lucide-coins' },
	{ key: 'tools', label: 'Tool Calls', value: formatCompact(totals.value.count_tool_calls), icon: 'i-lucide-wrench' }
])

// Aggregate by project
const list_projects = computed(() => {
	const map = new Map<string, { project: string, sessions: number, tokens: number, cost: number, tools: number }>()
	for (const s of list_sessions.value) {
		const entry = map.get(s.project) ?? { project: s.project, sessions: 0, tokens: 0, cost: 0, tools: 0 }
		entry.sessions++
		entry.tokens += s.tokens_input + s.tokens_output
		entry.cost += s.cost_usd
		entry.tools += s.count_tool_calls
		map.set(s.project, entry)
	}
	return Array.from(map.values()).sort((a, b) => b.cost - a.cost)
})

function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	if (m < 60) return `${m}m ${s}s`
	const h = Math.floor(m / 60)
	return `${h}h ${m % 60}m`
}

function tokenBar(input: number, output: number): { input_pct: number, output_pct: number } {
	const total = input + output
	if (total === 0) return { input_pct: 0, output_pct: 0 }
	return {
		input_pct: Math.round((input / total) * 100),
		output_pct: Math.round((output / total) * 100)
	}
}

// Find max cost to scale bars
const max_cost = computed(() => {
	const costs = list_sessions.value.map(s => s.cost_usd)
	return Math.max(...costs, 0.01)
})

async function handleClickSession(session: { id: string, cwd: string }): Promise<void> {
	if (is_loading_session.value) return
	is_loading_session.value = true
	try {
		const data = await $fetch<{ id: string, cwd: string, messages: Array<{ role: 'user' | 'assistant', content: string, timestamp: string }> }>(`/api/ai/sessions/${session.id}`)
		resumeSession(data.id, data.cwd, data.messages)
		navigateTo('/ai')
	} catch (error) {
		console.error('Failed to load session:', error)
	} finally {
		is_loading_session.value = false
	}
}
</script>

<template>
	<UDashboardPanel id="monitoring">
		<template #header>
			<UDashboardNavbar title="Monitoring">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<div class="flex items-center gap-2">
						<select
							v-model.number="filter_days"
							class="h-8 rounded-md border border-default bg-default text-sm px-2 pr-7 outline-none text-dimmed appearance-none cursor-pointer"
						>
							<option :value="1">
								Last 24h
							</option>
							<option :value="7">
								Last 7 days
							</option>
							<option :value="30">
								Last 30 days
							</option>
							<option :value="90">
								Last 90 days
							</option>
						</select>
					</div>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6 space-y-6">
				<!-- Summary stats -->
				<div v-if="status === 'pending'" class="grid grid-cols-2 lg:grid-cols-5 gap-4">
					<USkeleton v-for="i in 5" :key="i" class="h-24" />
				</div>
				<div v-else class="grid grid-cols-2 lg:grid-cols-5 gap-4">
					<UCard v-for="item in list_stats" :key="item.key">
						<div class="flex items-center gap-3">
							<div class="flex items-center justify-center size-10 rounded-lg bg-primary/10">
								<UIcon :name="item.icon" class="size-5 text-primary" />
							</div>
							<div>
								<p class="text-sm text-dimmed">
									{{ item.label }}
								</p>
								<p class="text-2xl font-bold tabular-nums">
									{{ item.value }}
								</p>
							</div>
						</div>
					</UCard>
				</div>

				<!-- Project breakdown -->
				<UCard v-if="list_projects.length > 0">
					<template #header>
						<h3 class="text-sm font-medium text-dimmed">
							Cost by Project
						</h3>
					</template>
					<div class="space-y-3">
						<div v-for="proj in list_projects" :key="proj.project" class="flex items-center gap-4">
							<span class="text-sm font-mono w-48 truncate" :title="proj.project">{{ proj.project }}</span>
							<div class="flex-1 h-5 bg-elevated/50 rounded-full overflow-hidden">
								<div
									class="h-full bg-primary/60 rounded-full transition-all"
									:style="{ width: `${Math.max(2, (proj.cost / (totals.cost_usd || 1)) * 100)}%` }"
								/>
							</div>
							<span class="text-sm tabular-nums w-20 text-right font-medium">${{ proj.cost.toFixed(2) }}</span>
							<span class="text-xs text-dimmed w-16 text-right">{{ proj.sessions }} sess.</span>
						</div>
					</div>
				</UCard>

				<!-- Session list -->
				<UCard>
					<template #header>
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium text-dimmed">
								Sessions
							</h3>
							<span class="text-xs text-dimmed">
								{{ list_sessions.length }} sessions
							</span>
						</div>
					</template>

					<div v-if="status === 'pending'" class="space-y-2">
						<USkeleton v-for="i in 8" :key="i" class="h-14" />
					</div>

					<div v-else-if="list_sessions.length > 0" class="divide-y divide-default">
						<div
							v-for="session in list_sessions"
							:key="session.id"
							class="flex items-center gap-4 py-3 px-1 hover:bg-elevated/30 rounded-lg transition-colors cursor-pointer group"
							@click="handleClickSession(session)"
						>
							<!-- Title + meta -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-sm truncate group-hover:text-primary transition-colors">{{ session.title || 'Untitled' }}</span>
									<UBadge color="neutral" variant="subtle" size="xs">
										{{ session.project }}
									</UBadge>
								</div>
								<div class="flex items-center gap-3 text-[10px] text-dimmed/60">
									<span>{{ formatTimeAgo(session.time_end) }}</span>
									<span>{{ formatDuration(session.duration_seconds) }}</span>
									<span>{{ session.count_turns }} turns</span>
									<span>{{ session.count_tool_calls }} tools</span>
								</div>
							</div>

							<!-- Token ratio bar -->
							<div class="w-24 flex flex-col gap-0.5">
								<div class="flex h-1.5 rounded-full overflow-hidden bg-elevated/50">
									<div class="bg-blue-400/70" :style="{ width: `${tokenBar(session.tokens_input, session.tokens_output).input_pct}%` }" />
									<div class="bg-emerald-400/70" :style="{ width: `${tokenBar(session.tokens_input, session.tokens_output).output_pct}%` }" />
								</div>
								<div class="flex justify-between text-[9px] text-dimmed/50">
									<span>{{ formatCompact(session.tokens_input) }} in</span>
									<span>{{ formatCompact(session.tokens_output) }} out</span>
								</div>
							</div>

							<!-- Cost bar -->
							<div class="w-28 flex items-center gap-2">
								<div class="flex-1 h-1.5 rounded-full overflow-hidden bg-elevated/50">
									<div
										class="h-full bg-amber-400/60 rounded-full"
										:style="{ width: `${Math.max(2, (session.cost_usd / max_cost) * 100)}%` }"
									/>
								</div>
								<span class="text-xs tabular-nums text-right w-14 font-medium">${{ session.cost_usd.toFixed(3) }}</span>
							</div>
						</div>
					</div>

					<div v-else class="flex flex-col items-center justify-center py-16 text-center">
						<UIcon name="i-lucide-activity" class="size-10 text-dimmed/30 mb-3" />
						<p class="text-sm text-dimmed">
							No session data found
						</p>
						<p class="text-xs text-dimmed/50 mt-1">
							Start a conversation in Claude Code to see metrics here
						</p>
					</div>
				</UCard>
			</div>
		</template>
	</UDashboardPanel>
</template>
