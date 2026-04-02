<script setup lang="ts">
import { buildMissionControlSnapshot } from '~/composables/useMissionControl'

useSeoMeta({ title: 'Mission Control' })

const {
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
} = useMissionControl()

const map_agents_display = computed(() => {
	if (!is_replaying.value) return agents.value

	const evt_current = replay_index.value > 0 ? all_events.value[replay_index.value - 1] : null
	const ts_replay = evt_current ? Date.parse(evt_current.ts) : Date.now()

	return buildMissionControlSnapshot(all_events.value.slice(0, replay_index.value), {
		threshold_ms: threshold_ms.value,
		now_ms: Number.isNaN(ts_replay) ? Date.now() : ts_replay
	})
})

const list_agents = computed(() =>
	Array.from(map_agents_display.value.values()).sort((left, right) => {
		if (left.status !== right.status) {
			const priority = { running: 0, stuck: 1, completed: 2 }
			return priority[left.status] - priority[right.status]
		}
		return right.last_event_ts.localeCompare(left.last_event_ts)
	})
)

const count_live_agents = computed(() => agents.value.size)
const pane_node = computed(() => selected_node.value?.node ?? null)
const pane_type = computed(() => selected_node.value?.type ?? null)

const class_connection = computed(() => {
	if (is_connected.value) return 'bg-emerald-500'
	if (count_live_agents.value) return 'bg-amber-500'
	return 'bg-rose-500'
})

const label_connection = computed(() => {
	if (is_connected.value) return 'Connected'
	if (count_live_agents.value) return 'Stale'
	return 'Disconnected'
})

function handleReplayAt(index: number): void {
	if (index >= all_events.value.length) {
		is_replaying.value = false
		replay_index.value = all_events.value.length
		return
	}

	is_replaying.value = true
	replay_index.value = Math.max(0, index)
}
</script>

<template>
	<UDashboardPanel id="mission-control">
		<template #header>
			<UDashboardNavbar title="Mission Control">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<div class="flex items-center gap-2 text-sm text-dimmed">
						<span class="size-2.5 rounded-full" :class="class_connection" />
						<span>{{ label_connection }}</span>
					</div>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="space-y-6 p-6">
				<ConflictBanner
					:conflicts="conflicts"
					@dismiss="dismiss_conflict"
				/>

				<FlightHeader :agents="list_agents" :is_connected="is_connected" />

				<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
					<TaskTree
						:agents="list_agents"
						@select-agent="select_agent"
						@select-tool="select_tool"
					/>

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-sm font-medium text-dimmed">
								Agent Grid
							</h2>
							<UBadge color="neutral" variant="subtle" size="sm">
								{{ list_agents.length }} visible
							</UBadge>
						</div>

						<div v-if="list_agents.length" class="grid gap-4 md:grid-cols-2">
							<AgentCard
								v-for="agent in list_agents"
								:key="agent.agent_id"
								:agent="agent"
							/>
						</div>

						<UCard v-else>
							<div class="py-10 text-center">
								<UIcon name="i-lucide-satellite-dish" class="mx-auto mb-3 size-10 text-dimmed/40" />
								<p class="text-sm text-dimmed">
									Mission Control is listening for agent activity
								</p>
							</div>
						</UCard>
					</div>
				</div>

				<FlightRecorder
					:events="all_events"
					@replay-at="handleReplayAt"
				/>
			</div>

			<DetailPane
				:node="pane_node"
				:type="pane_type"
				@close="clear_selection"
			/>
		</template>
	</UDashboardPanel>
</template>
