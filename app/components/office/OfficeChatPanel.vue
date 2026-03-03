<script setup lang="ts">
import type { AgentChatState } from '~/composables/useOfficeChat'

const props = defineProps<{
	chat: AgentChatState | null
	allChats: Map<string, AgentChatState>
}>()

const emit = defineEmits<{
	send: [prompt: string]
	selectAgent: [id: string]
}>()

const text_input = ref('')
const el_scroll = ref<HTMLElement | null>(null)

function scrollToBottom(): void {
	nextTick(() => {
		if (el_scroll.value) {
			el_scroll.value.scrollTop = el_scroll.value.scrollHeight
		}
	})
}

watch(() => props.chat?.list_messages, () => {
	scrollToBottom()
}, { deep: true })

watch(() => props.chat?.text_partial, () => {
	scrollToBottom()
})

function handleSend(): void {
	const prompt = text_input.value.trim()
	if (!prompt || props.chat?.is_streaming) return
	text_input.value = ''
	emit('send', prompt)
}

function handleKeydown(event: KeyboardEvent): void {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault()
		handleSend()
	}
}

const list_agents = computed(() => {
	return Array.from(props.allChats.values())
})
</script>

<template>
	<div class="flex flex-col h-full">
		<!-- Agent tab bar -->
		<div class="flex items-center gap-1 px-3 py-2 border-b border-default overflow-x-auto shrink-0">
			<button
				v-for="agent in list_agents"
				:key="agent.id_agent"
				class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer"
				:class="chat?.id_agent === agent.id_agent ? 'bg-primary/10 text-primary' : 'text-dimmed hover:text-default hover:bg-elevated/50'"
				@click="emit('selectAgent', agent.id_agent)"
			>
				<span>{{ agent.name_agent }}</span>
				<span
					v-if="agent.is_streaming"
					class="size-1.5 rounded-full bg-green-500 animate-pulse"
				/>
			</button>
		</div>

		<!-- Chat content -->
		<div ref="el_scroll" class="flex-1 overflow-y-auto min-h-0">
			<!-- No agent selected -->
			<div v-if="!chat" class="flex items-center justify-center h-full">
				<div class="text-center space-y-2">
					<UIcon name="i-lucide-message-square" class="size-8 text-dimmed/30 mx-auto" />
					<p class="text-sm text-dimmed">Click an agent to start chatting</p>
				</div>
			</div>

			<!-- Agent selected but no messages -->
			<div v-else-if="chat.list_messages.length === 0 && !chat.is_streaming" class="flex items-center justify-center h-full">
				<div class="text-center space-y-2">
					<UIcon name="i-lucide-bot" class="size-8 text-dimmed/30 mx-auto" />
					<p class="text-sm text-dimmed">Start a conversation with {{ chat.name_agent }}</p>
				</div>
			</div>

			<!-- Messages -->
			<div v-else class="py-4 px-4 space-y-4">
				<template v-for="msg in chat.list_messages" :key="msg.id_message">
					<!-- User message -->
					<div v-if="msg.role === 'user'" class="flex gap-3">
						<div class="shrink-0 mt-0.5">
							<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
								<UIcon name="i-lucide-user" class="size-3.5 text-primary" />
							</div>
						</div>
						<div class="min-w-0">
							<p class="text-xs font-medium text-dimmed mb-1">You</p>
							<div class="text-sm whitespace-pre-wrap">{{ msg.content }}</div>
						</div>
					</div>

					<!-- Assistant message -->
					<div v-else class="flex gap-3">
						<div class="shrink-0 mt-0.5">
							<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
								<UIcon name="i-lucide-bot" class="size-3.5 text-primary" />
							</div>
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium text-dimmed mb-1">{{ chat.name_agent }}</p>
							<MDC
								:value="msg.content"
								tag="div"
								class="prose prose-sm dark:prose-invert max-w-none [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto"
							/>
						</div>
					</div>
				</template>

				<!-- Streaming partial -->
				<div v-if="chat.is_streaming && chat.text_partial" class="flex gap-3">
					<div class="shrink-0 mt-0.5">
						<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
							<UIcon name="i-lucide-bot" class="size-3.5 text-primary animate-pulse" />
						</div>
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-medium text-dimmed mb-1">{{ chat.name_agent }}</p>
						<MDC
							:value="chat.text_partial"
							tag="div"
							class="prose prose-sm dark:prose-invert max-w-none [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto"
						/>
					</div>
				</div>

				<!-- Thinking indicator -->
				<div v-if="chat.is_streaming && !chat.text_partial" class="flex gap-3">
					<div class="shrink-0 mt-0.5">
						<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
							<UIcon name="i-lucide-bot" class="size-3.5 text-primary animate-pulse" />
						</div>
					</div>
					<div>
						<p class="text-xs font-medium text-dimmed mb-1">{{ chat.name_agent }}</p>
						<div class="flex items-center gap-2 text-sm text-dimmed">
							<UIcon name="i-lucide-loader" class="size-3.5 animate-spin" />
							<span>Thinking...</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Input area -->
		<div v-if="chat" class="border-t border-default p-3 shrink-0">
			<div class="flex gap-2 items-end">
				<UTextarea
					v-model="text_input"
					:rows="1"
					autoresize
					:maxrows="4"
					:placeholder="`Message ${chat.name_agent}... (Enter to send)`"
					class="flex-1"
					:disabled="chat.is_streaming"
					@keydown="handleKeydown"
				/>
				<UButton
					icon="i-lucide-arrow-up"
					color="primary"
					size="md"
					:disabled="!text_input.trim() || chat.is_streaming"
					:loading="chat.is_streaming"
					@click="handleSend"
				/>
			</div>
		</div>
	</div>
</template>
