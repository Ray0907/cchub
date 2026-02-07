<script setup lang="ts">
import type { ChatMessage } from '~/composables/useAiChat'

const props = defineProps<{
	message: ChatMessage
}>()

const time_display = computed(() => {
	const date = new Date(props.message.time_created)
	return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
	<div
		class="flex gap-2"
		:class="message.role === 'user' ? 'justify-end' : 'justify-start'"
	>
		<div v-if="message.role === 'assistant'" class="shrink-0 mt-1">
			<UIcon name="i-lucide-sparkles" class="size-4 text-primary" />
		</div>

		<div
			class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
			:class="message.role === 'user'
				? 'bg-primary text-inverted'
				: 'bg-elevated ring-1 ring-default'"
		>
			<MDC
				v-if="message.role === 'assistant'"
				:value="message.content"
				tag="div"
				class="prose prose-sm dark:prose-invert max-w-none [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
			/>
			<div v-else class="whitespace-pre-wrap">
				{{ message.content }}
			</div>
			<div
				class="text-[10px] mt-1 opacity-50"
				:class="message.role === 'user' ? 'text-right' : 'text-left'"
			>
				{{ time_display }}
			</div>
		</div>
	</div>
</template>
