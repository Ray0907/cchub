<script setup lang="ts">
const props = withDefaults(defineProps<{
	entries: Record<string, unknown>[]
	selectable?: boolean
	selected?: Set<string>
}>(), {
	selectable: false,
	selected: () => new Set<string>(),
})

const emit = defineEmits<{
	toggle: [timestamp: string]
}>()

const id_expanded = ref<number | null>(null)

function toggleExpand(index: number): void {
	id_expanded.value = id_expanded.value === index ? null : index
}

function extractProject(row: Record<string, unknown>): string {
	const project = row.project
	if (!project || typeof project !== 'string') return '-'
	return project.split('/').pop() || project
}

function formatTimestamp(ts: unknown): string {
	if (typeof ts === 'number') return new Date(ts).toLocaleString('en-US')
	if (typeof ts === 'string' && ts) return new Date(ts).toLocaleString('en-US')
	return '-'
}

function getTimestampKey(entry: Record<string, unknown>): string {
	return String(entry.timestamp ?? '')
}
</script>

<template>
	<div class="space-y-1">
		<!-- Header -->
		<div class="flex items-center gap-3 px-3 py-2 text-xs font-medium text-dimmed">
			<span v-if="selectable" class="w-5 shrink-0" />
			<span class="w-5 shrink-0" />
			<span class="w-28 shrink-0">Project</span>
			<span class="flex-1 min-w-0">Message</span>
			<span class="w-20 shrink-0 text-right hidden sm:block">Time</span>
		</div>

		<!-- Rows -->
		<div
			v-for="(entry, index) in entries"
			:key="index"
		>
			<div
				class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-elevated/50 transition-colors group"
				:class="[
					id_expanded === index ? 'bg-elevated/30' : '',
					selectable && selected.has(getTimestampKey(entry)) ? 'bg-primary/5' : '',
				]"
				@click="toggleExpand(index)"
			>
				<UCheckbox
					v-if="selectable"
					:model-value="selected.has(getTimestampKey(entry))"
					class="shrink-0"
					@click.stop
					@update:model-value="emit('toggle', getTimestampKey(entry))"
				/>
				<UIcon
					:name="id_expanded === index ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
					class="size-3.5 shrink-0 text-dimmed group-hover:text-default transition-colors"
				/>
				<UBadge color="neutral" variant="subtle" size="sm" class="w-28 shrink-0 justify-center truncate">
					{{ extractProject(entry) }}
				</UBadge>
				<span class="flex-1 min-w-0 text-sm truncate">
					{{ extractMessage(entry) }}
				</span>
				<span class="w-20 shrink-0 text-xs text-dimmed text-right hidden sm:block">
					{{ formatHistoryTimeAgo(entry.timestamp) }}
				</span>
			</div>

			<!-- Expanded content -->
			<div
				v-if="id_expanded === index"
				class="ml-8 mr-3 mb-2 rounded-lg bg-elevated/20 border border-default overflow-hidden"
			>
				<!-- Meta bar -->
				<div class="flex items-center gap-3 px-4 py-2 border-b border-default text-xs text-dimmed">
					<span v-if="entry.project" class="font-mono truncate">
						{{ entry.project }}
					</span>
					<span class="flex-1" />
					<span class="shrink-0">{{ formatTimestamp(entry.timestamp) }}</span>
				</div>
				<!-- Message body -->
				<div class="px-4 py-3">
					<pre class="text-sm whitespace-pre-wrap break-words leading-relaxed">{{ extractMessage(entry) }}</pre>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<div v-if="!entries.length" class="flex flex-col items-center justify-center py-16 text-center">
			<UIcon name="i-lucide-clock" class="size-10 text-dimmed/30 mb-3" />
			<p class="text-sm text-dimmed">
				No history entries found.
			</p>
		</div>

	</div>
</template>
