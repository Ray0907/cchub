<script setup lang="ts">
withDefaults(defineProps<{
	scripts: {
		name_file: string
		content_raw: string
	}[]
	can_edit?: boolean
}>(), {
	can_edit: false
})

const emit = defineEmits<{
	save: [payload: { name_file: string; content_raw: string }]
}>()
</script>

<template>
	<div v-if="scripts.length" class="space-y-4">
		<UCard v-for="script in scripts" :key="script.name_file">
			<template #header>
				<div class="flex items-center gap-2">
					<UIcon name="i-lucide-file-code" class="size-4 text-dimmed" />
					<span class="text-sm font-mono font-medium">{{ script.name_file }}</span>
				</div>
			</template>
			<CodeViewer
				:content="script.content_raw"
				language="bash"
				:can_edit="can_edit"
				@save="emit('save', { name_file: script.name_file, content_raw: $event })"
			/>
		</UCard>
	</div>
	<div v-else class="text-sm text-dimmed">
		No hook scripts found.
	</div>
</template>
