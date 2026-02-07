<script setup lang="ts">
const { list_messages, is_streaming, text_partial, path_cwd, sendMessage } = useAiChat()
const route = useRoute()

const text_input = ref('')
const el_scroll = ref<HTMLElement | null>(null)

function scrollToBottom(): void {
	nextTick(() => {
		if (el_scroll.value) {
			el_scroll.value.scrollTop = el_scroll.value.scrollHeight
		}
	})
}

watch([list_messages, text_partial], () => {
	scrollToBottom()
})

async function handleSend(): Promise<void> {
	const prompt = text_input.value.trim()
	if (!prompt || is_streaming.value) return

	text_input.value = ''
	await sendMessage(prompt, route.path)
}

function handleKeydown(event: KeyboardEvent): void {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault()
		handleSend()
	}
}

const label_cwd = computed(() => {
	if (!path_cwd.value) return '~/.claude/'
	const home = path_cwd.value.replace(/^\/Users\/[^/]+/, '~')
	return home.length > 30 ? '...' + home.slice(-27) : home
})
</script>

<template>
	<div class="flex flex-col h-full">
		<!-- Folder selector -->
		<div class="border-b border-default px-3 py-2">
			<div class="flex items-center gap-1.5">
				<UIcon name="i-lucide-folder-open" class="size-3.5 text-dimmed shrink-0" />
				<UInput
					v-model="path_cwd"
					size="xs"
					variant="subtle"
					:placeholder="label_cwd"
					class="flex-1"
					:ui="{ base: 'font-mono text-xs' }"
				/>
			</div>
			<p class="text-[10px] text-dimmed mt-1">
				Working directory for AI (leave empty for ~/.claude/)
			</p>
		</div>

		<!-- Messages area -->
		<div ref="el_scroll" class="flex-1 overflow-y-auto p-4 space-y-3">
			<template v-if="list_messages.length === 0 && !is_streaming">
				<div class="flex flex-col items-center justify-center h-full text-dimmed text-sm gap-2">
					<UIcon name="i-lucide-sparkles" class="size-8 opacity-30" />
					<p>Ask anything about your code</p>
					<p class="text-xs opacity-60">
						Can read, edit, and write files
					</p>
				</div>
			</template>

			<AiChatMessage
				v-for="msg in list_messages"
				:key="msg.id_message"
				:message="msg"
			/>

			<!-- Streaming partial -->
			<div v-if="is_streaming && text_partial" class="flex gap-2 justify-start">
				<div class="shrink-0 mt-1">
					<UIcon name="i-lucide-sparkles" class="size-4 text-primary animate-pulse" />
				</div>
				<div class="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-elevated ring-1 ring-default">
					<MDC
						:value="text_partial"
						tag="div"
						class="prose prose-sm dark:prose-invert max-w-none [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
					/>
				</div>
			</div>

			<!-- Loading indicator -->
			<div v-if="is_streaming && !text_partial" class="flex gap-2 justify-start">
				<div class="shrink-0 mt-1">
					<UIcon name="i-lucide-sparkles" class="size-4 text-primary animate-pulse" />
				</div>
				<div class="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-elevated ring-1 ring-default">
					<span class="text-dimmed">Thinking...</span>
				</div>
			</div>
		</div>

		<!-- Input area -->
		<div class="border-t border-default p-3">
			<div class="flex gap-2">
				<UTextarea
					v-model="text_input"
					:rows="1"
					autoresize
					:maxrows="4"
					placeholder="Ask about your code..."
					class="flex-1"
					:disabled="is_streaming"
					@keydown="handleKeydown"
				/>
				<UButton
					icon="i-lucide-send"
					color="primary"
					size="sm"
					:disabled="!text_input.trim() || is_streaming"
					:loading="is_streaming"
					@click="handleSend"
				/>
			</div>
		</div>
	</div>
</template>
