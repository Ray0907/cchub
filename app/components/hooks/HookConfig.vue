<script setup lang="ts">
const props = withDefaults(defineProps<{
	config: unknown
	can_edit?: boolean
}>(), {
	can_edit: false
})

const emit = defineEmits<{
	save: [content: string]
}>()

const content_json = computed(() => {
	if (!props.config) return ''
	return JSON.stringify(props.config, null, 2)
})
</script>

<template>
	<UCard>
		<template #header>
			<div class="flex items-center gap-2">
				<UIcon name="i-lucide-settings" class="size-4 text-dimmed" />
				<span class="text-sm font-medium">Hook Configuration (from settings.json)</span>
			</div>
		</template>
		<CodeViewer
			v-if="content_json"
			:content="content_json"
			language="json"
			:can_edit="can_edit"
			@save="emit('save', $event)"
		/>
		<div v-else class="text-sm text-dimmed p-4">
			No hook configuration found in settings.
		</div>
	</UCard>
</template>
