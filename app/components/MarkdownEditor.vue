<script setup lang="ts">
defineProps<{
	modelValue: string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const is_preview = ref(false)

function handleInput(event: Event) {
	const target = event.target as HTMLTextAreaElement
	emit('update:modelValue', target.value)
}
</script>

<template>
	<div class="flex flex-col h-full">
		<div class="flex items-center justify-end gap-2 p-2 border-b border-default">
			<UButton
				:icon="is_preview ? 'lucide:pencil' : 'lucide:eye'"
				:label="is_preview ? 'Edit' : 'Preview'"
				color="neutral"
				variant="ghost"
				size="xs"
				@click="is_preview = !is_preview"
			/>
		</div>

		<div class="flex-1 overflow-auto">
			<textarea
				v-if="!is_preview"
				:value="modelValue"
				class="w-full h-full p-4 font-mono text-sm bg-transparent resize-none focus:outline-none"
				spellcheck="false"
				@input="handleInput"
			/>
			<MDC
				v-else
				:value="modelValue"
				tag="article"
				class="prose prose-sm dark:prose-invert max-w-none p-4"
			/>
		</div>
	</div>
</template>
