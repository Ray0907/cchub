<script setup lang="ts">
const props = defineProps<{
	modelValue: object | string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: object | string]
}>()

const content_text = ref('')
const error_message = ref('')

watchEffect(() => {
	if (typeof props.modelValue === 'string') {
		content_text.value = props.modelValue
	}
	else {
		content_text.value = JSON.stringify(props.modelValue, null, '\t')
	}
})

function handleInput(event: Event) {
	const target = event.target as HTMLTextAreaElement
	content_text.value = target.value
	validateAndEmit(target.value)
}

function validateAndEmit(raw: string) {
	try {
		const parsed = JSON.parse(raw)
		error_message.value = ''
		emit('update:modelValue', parsed)
	}
	catch (err) {
		error_message.value = err instanceof Error ? err.message : 'Invalid JSON'
	}
}

function formatJson() {
	try {
		const parsed = JSON.parse(content_text.value)
		content_text.value = JSON.stringify(parsed, null, '\t')
		error_message.value = ''
		emit('update:modelValue', parsed)
	}
	catch (err) {
		error_message.value = err instanceof Error ? err.message : 'Invalid JSON'
	}
}
</script>

<template>
	<div class="flex flex-col h-full">
		<div class="flex items-center justify-between gap-2 p-2 border-b border-default">
			<span
				v-if="error_message"
				class="text-xs text-red-500 truncate"
			>
				{{ error_message }}
			</span>
			<span v-else />
			<UButton
				icon="lucide:align-left"
				label="Format"
				color="neutral"
				variant="ghost"
				size="xs"
				@click="formatJson"
			/>
		</div>

		<div class="flex-1 overflow-auto">
			<textarea
				:value="content_text"
				class="w-full h-full p-4 font-mono text-sm bg-transparent resize-none focus:outline-none"
				spellcheck="false"
				@input="handleInput"
			/>
		</div>
	</div>
</template>
