<script setup lang="ts">
defineProps<{
	items: {
		name_file: string
		time_modified: string
	}[]
}>()

function formatTime(iso: string) {
	return new Date(iso).toLocaleString('en-US')
}
</script>

<template>
	<div v-if="items.length" class="space-y-2">
		<UCard
			v-for="session in items"
			:key="session.name_file"
			class="hover:ring-primary/50 hover:ring-1 transition-all cursor-pointer"
			@click="navigateTo(`/sessions/${session.name_file}`)"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<UIcon name="i-lucide-clock" class="size-4 text-dimmed" />
					<span class="text-sm font-mono">{{ session.name_file }}</span>
				</div>
				<span class="text-xs text-dimmed">{{ formatTime(session.time_modified) }}</span>
			</div>
		</UCard>
	</div>
	<div v-else class="text-sm text-dimmed">
		No sessions found.
	</div>
</template>
