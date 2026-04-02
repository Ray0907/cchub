<script setup lang="ts">
import type { ConflictEntry } from '~/composables/useMissionControl'

const props = defineProps<{
	conflicts: ConflictEntry[]
}>()

const emit = defineEmits<{
	dismiss: [file_path: string]
}>()

function formatTime(value: string): string {
	const ts = Date.parse(value)
	if (Number.isNaN(ts)) return value
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit'
	}).format(ts)
}

function labelAgent(agent_id: string): string {
	const segments = agent_id.split(':')
	return segments.at(-1) || agent_id
}
</script>

<template>
	<div v-if="props.conflicts.length" class="space-y-3">
		<div
			v-for="conflict in props.conflicts"
			:key="`${conflict.file_path}:${conflict.detected_at}`"
			class="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-rose-500/12 to-amber-500/12 p-4 shadow-sm"
		>
			<div class="flex items-start gap-3">
				<div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
					<UIcon name="i-lucide-triangle-alert" class="size-5" />
				</div>

				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="text-sm font-semibold text-highlighted">
							Edit conflict predicted
						</p>
						<UBadge
							color="neutral"
							variant="soft"
							size="xs"
							class="text-amber-700 dark:text-amber-300"
						>
							{{ conflict.agents.length }} agents
						</UBadge>
						<span class="text-xs text-dimmed">
							{{ formatTime(conflict.detected_at) }}
						</span>
					</div>

					<p class="mt-1 truncate font-mono text-sm text-highlighted" :title="conflict.file_path">
						{{ conflict.file_path }}
					</p>

					<div class="mt-3 flex flex-wrap gap-2">
						<UBadge
							v-for="agent_id in conflict.agents"
							:key="agent_id"
							color="neutral"
							variant="soft"
							size="sm"
							class="font-mono text-rose-700 dark:text-rose-300"
						>
							{{ labelAgent(agent_id) }}
						</UBadge>
					</div>
				</div>

				<button
					type="button"
					class="rounded-lg p-1 text-dimmed transition hover:bg-default/70 hover:text-highlighted"
					@click="emit('dismiss', conflict.file_path)"
				>
					<span class="sr-only">Dismiss conflict</span>
					<UIcon name="i-lucide-x" class="size-4" />
				</button>
			</div>
		</div>
	</div>
</template>
