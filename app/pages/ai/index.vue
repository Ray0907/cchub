<script setup lang="ts">
useSeoMeta({ title: 'Claude Code' })

const { list_messages, is_streaming, text_partial, path_cwd, id_session, sendMessage, clearChat, resumeSession } = useAiChat()

const text_input = ref('')
const el_scroll = ref<HTMLElement | null>(null)
const is_loading_session = ref(false)

// Fetch recent sessions for the welcome screen
const { data: data_sessions, refresh: refreshSessions } = useFetch('/api/ai/sessions', {
	default: () => ({ sessions: [], projects: [], count_total: 0, count_filtered: 0 })
})
const list_sessions = computed(() => data_sessions.value?.sessions ?? [])

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
	await sendMessage(prompt, 'Claude Code full page')
}

async function handleSuggestion(prompt: string): Promise<void> {
	if (is_streaming.value) return
	await sendMessage(prompt, 'Claude Code full page')
}

function handleKeydown(event: KeyboardEvent): void {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault()
		handleSend()
	}
}

async function handleResumeSession(session: { id: string; cwd: string }): Promise<void> {
	if (is_loading_session.value) return
	is_loading_session.value = true
	try {
		const data = await $fetch<{ id: string; cwd: string; messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> }>(`/api/ai/sessions/${session.id}`)
		resumeSession(data.id, data.cwd, data.messages)
	}
	catch (error) {
		console.error('Failed to load session:', error)
	}
	finally {
		is_loading_session.value = false
	}
}

const id_deleting = ref<string | null>(null)
const id_confirm_delete = ref<string | null>(null)

function cancelDelete(): void {
	id_confirm_delete.value = null
}

async function confirmDelete(session: { id: string; project: string }): Promise<void> {
	id_deleting.value = session.id
	try {
		await $fetch(`/api/ai/sessions/${session.id}`, {
			method: 'DELETE',
			body: { project: session.project }
		})
		await refreshSessions()
	}
	catch (error) {
		console.error('Failed to delete session:', error)
	}
	finally {
		id_deleting.value = null
		id_confirm_delete.value = null
	}
}

const label_cwd = computed(() => {
	if (!path_cwd.value) return '~/.claude/'
	return formatCwd(path_cwd.value, 40)
})

const list_suggestions = [
	{ icon: 'i-lucide-file-search', label: 'Explore this project', prompt: 'Give me an overview of this project structure and key files' },
	{ icon: 'i-lucide-bug', label: 'Find & fix bugs', prompt: 'Help me find and fix bugs in this codebase' },
	{ icon: 'i-lucide-plus', label: 'Add a feature', prompt: 'Help me add a new feature to this project' },
	{ icon: 'i-lucide-settings-2', label: 'Edit config', prompt: 'Show me my Claude configuration and suggest improvements' },
]
</script>

<template>
	<UDashboardPanel id="ai">
		<template #header>
			<UDashboardNavbar>
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #title>
					<div class="flex items-center gap-2">
						<UIcon name="i-lucide-terminal-square" class="size-4 text-primary" />
						<span>Claude Code</span>
					</div>
				</template>
				<template #right>
					<div class="flex items-center gap-2">
						<div class="flex items-center gap-1.5 rounded-md border border-default px-2 py-1">
							<UIcon name="i-lucide-folder-open" class="size-3.5 text-dimmed shrink-0" />
							<input
								v-model="path_cwd"
								type="text"
								:placeholder="label_cwd"
								class="bg-transparent text-xs font-mono w-48 outline-none placeholder:text-dimmed/50"
							>
						</div>
						<UBadge v-if="id_session" color="neutral" variant="subtle" size="xs">
							<UIcon name="i-lucide-radio" class="size-2.5" />
							Session
						</UBadge>
						<UButton
							icon="i-lucide-plus"
							label="New Chat"
							color="neutral"
							variant="subtle"
							size="xs"
							@click="clearChat"
						/>
					</div>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="flex flex-col h-full">
				<!-- Messages area -->
				<div ref="el_scroll" class="flex-1 overflow-y-auto">
					<!-- Welcome state -->
					<div v-if="list_messages.length === 0 && !is_streaming" class="flex items-center justify-center h-full">
						<div class="max-w-2xl mx-auto text-center space-y-8 px-4 py-8">
							<div class="space-y-3">
								<UIcon name="i-lucide-terminal-square" class="size-10 text-primary mx-auto" />
								<h2 class="text-2xl font-semibold">
									Claude Code
								</h2>
								<p class="text-dimmed text-sm max-w-md mx-auto">
									Full Claude Code in your browser. Read, search, edit files and run shell commands — no GitHub repo limits.
								</p>
								<p class="text-xs text-dimmed/50">
									Working in: <code class="font-mono text-dimmed/70">{{ label_cwd }}</code>
								</p>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<button
									v-for="item in list_suggestions"
									:key="item.label"
									class="flex items-center gap-3 p-3 rounded-lg text-left text-sm border border-default hover:bg-elevated/50 transition-colors cursor-pointer"
									@click="handleSuggestion(item.prompt)"
								>
									<UIcon :name="item.icon" class="size-4 text-dimmed shrink-0" />
									<span>{{ item.label }}</span>
								</button>
							</div>

							<!-- Recent Sessions -->
							<div v-if="list_sessions && list_sessions.length > 0" class="text-left space-y-3">
								<div class="flex items-center justify-between">
									<h3 class="text-xs font-medium text-dimmed uppercase tracking-wider">
										Recent Sessions
										<UBadge color="neutral" variant="subtle" size="xs" class="ml-2">
											{{ data_sessions?.count_total ?? 0 }}
										</UBadge>
									</h3>
									<NuxtLink
										to="/ai/sessions"
										class="text-xs text-primary hover:underline"
									>
										Manage all
									</NuxtLink>
								</div>
								<div class="space-y-1">
									<div
										v-for="session in list_sessions.slice(0, 8)"
										:key="session.id"
										class="relative"
									>
										<!-- Confirm delete overlay -->
										<div
											v-if="id_confirm_delete === session.id"
											class="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/20"
										>
											<span class="text-xs text-error flex-1">Delete this session?</span>
											<UButton
												label="Cancel"
												color="neutral"
												variant="ghost"
												size="xs"
												@click="cancelDelete"
											/>
											<UButton
												label="Delete"
												color="error"
												variant="soft"
												size="xs"
												:loading="id_deleting === session.id"
												@click="confirmDelete(session)"
											/>
										</div>
										<!-- Normal session row -->
										<div
											v-else
											class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm hover:bg-elevated/50 transition-colors cursor-pointer group"
											@click="handleResumeSession(session)"
										>
											<UIcon name="i-lucide-message-square" class="size-3.5 text-dimmed shrink-0 group-hover:text-primary transition-colors" />
											<span class="flex-1 truncate">{{ session.title || 'Untitled session' }}</span>
											<span class="text-[10px] text-dimmed/50 shrink-0 font-mono">{{ formatCwd(session.cwd) }}</span>
											<span class="text-[10px] text-dimmed/50 shrink-0">{{ formatTimeAgo(session.time_modified) }}</span>
											<button
												class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-error/10 text-dimmed hover:text-error"
												title="Delete session"
												@click.stop="id_confirm_delete = session.id"
											>
												<UIcon name="i-lucide-trash-2" class="size-3.5" />
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Conversation -->
					<div v-else class="max-w-4xl mx-auto py-6 px-4 space-y-6">
						<template v-for="msg in list_messages" :key="msg.id_message">
							<!-- User turn -->
							<div v-if="msg.role === 'user'" class="flex gap-3">
								<div class="shrink-0 mt-0.5">
									<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
										<UIcon name="i-lucide-user" class="size-3.5 text-primary" />
									</div>
								</div>
								<div class="min-w-0">
									<p class="text-xs font-medium text-dimmed mb-1">You</p>
									<div class="text-sm whitespace-pre-wrap">
										{{ msg.content }}
									</div>
								</div>
							</div>

							<!-- Assistant turn -->
							<div v-else class="flex gap-3">
								<div class="shrink-0 mt-0.5">
									<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
										<UIcon name="i-lucide-sparkles" class="size-3.5 text-primary" />
									</div>
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-xs font-medium text-dimmed mb-1">Claude</p>
									<MDC
										:value="msg.content"
										tag="div"
										class="prose prose-sm dark:prose-invert max-w-none [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto"
									/>
								</div>
							</div>
						</template>

						<!-- Streaming partial -->
						<div v-if="is_streaming && text_partial" class="flex gap-3">
							<div class="shrink-0 mt-0.5">
								<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
									<UIcon name="i-lucide-sparkles" class="size-3.5 text-primary animate-pulse" />
								</div>
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-xs font-medium text-dimmed mb-1">Claude</p>
								<MDC
									:value="text_partial"
									tag="div"
									class="prose prose-sm dark:prose-invert max-w-none [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto"
								/>
							</div>
						</div>

						<!-- Thinking indicator -->
						<div v-if="is_streaming && !text_partial" class="flex gap-3">
							<div class="shrink-0 mt-0.5">
								<div class="size-6 rounded-full bg-primary/10 flex items-center justify-center">
									<UIcon name="i-lucide-sparkles" class="size-3.5 text-primary animate-pulse" />
								</div>
							</div>
							<div>
								<p class="text-xs font-medium text-dimmed mb-1">Claude</p>
								<div class="flex items-center gap-2 text-sm text-dimmed">
									<UIcon name="i-lucide-loader" class="size-3.5 animate-spin" />
									<span>Thinking...</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Input area -->
				<div class="border-t border-default p-4 bg-default/50">
					<div class="max-w-4xl mx-auto">
						<div class="flex gap-3 items-end">
							<UTextarea
								v-model="text_input"
								:rows="1"
								autoresize
								:maxrows="6"
								placeholder="Ask Claude Code anything... (Enter to send)"
								class="flex-1"
								:disabled="is_streaming"
								@keydown="handleKeydown"
							/>
							<UButton
								icon="i-lucide-arrow-up"
								color="primary"
								size="md"
								:disabled="!text_input.trim() || is_streaming"
								:loading="is_streaming"
								@click="handleSend"
							/>
						</div>
						<p class="text-[10px] text-dimmed/50 mt-1.5 text-center">
							Full filesystem access: read, edit, write files and run commands in {{ label_cwd }}
						</p>
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
