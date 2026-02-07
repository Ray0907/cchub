<script setup lang="ts">
useSeoMeta({ title: 'Session Manager' })

const { resumeSession } = useAiChat()

const query_search = ref('')
const query_debounced = refDebounced(query_search, 300)
const filter_project = ref('')
const tab_active = ref<'active' | 'archive'>('active')

const url_params = computed(() => ({
	q: query_debounced.value || undefined,
	project: filter_project.value || undefined,
	limit: 100
}))

const { data, refresh, status } = useFetch('/api/ai/sessions', {
	query: url_params,
	watch: [url_params],
	default: () => ({ sessions: [], projects: [], count_total: 0, count_filtered: 0 })
})

const list_sessions = computed(() => data.value?.sessions ?? [])
const list_projects = computed(() => data.value?.projects ?? [])

// Archive data
const { data: list_archive, refresh: refreshArchive } = useFetch('/api/ai/sessions/archive', {
	default: () => [] as Array<{ id: string; title: string; project: string; deleted_at: string }>
})

const is_loading_session = ref(false)
const id_deleting = ref<string | null>(null)
const id_confirm_delete = ref<string | null>(null)

// Multi-select
const set_selected = ref(new Set<string>())
const is_bulk_deleting = ref(false)

const is_all_selected = computed(() =>
	list_sessions.value.length > 0 && set_selected.value.size === list_sessions.value.length
)

function toggleSelect(id: string): void {
	const next = new Set(set_selected.value)
	if (next.has(id)) next.delete(id)
	else next.add(id)
	set_selected.value = next
}

function toggleSelectAll(): void {
	if (is_all_selected.value) {
		set_selected.value = new Set()
	}
	else {
		set_selected.value = new Set(list_sessions.value.map(s => s.id))
	}
}

function clearSelection(): void {
	set_selected.value = new Set()
}

// Clear selection when search/filter changes
watch([query_debounced, filter_project], () => {
	clearSelection()
})

// Archive multi-select
const set_archive_selected = ref(new Set<string>())
const is_bulk_archive_deleting = ref(false)

const is_all_archive_selected = computed(() =>
	(list_archive.value?.length ?? 0) > 0 && set_archive_selected.value.size === (list_archive.value?.length ?? 0)
)

function toggleArchiveSelect(id: string): void {
	const next = new Set(set_archive_selected.value)
	if (next.has(id)) next.delete(id)
	else next.add(id)
	set_archive_selected.value = next
}

function toggleArchiveSelectAll(): void {
	if (is_all_archive_selected.value) {
		set_archive_selected.value = new Set()
	}
	else {
		set_archive_selected.value = new Set((list_archive.value ?? []).map(s => s.id))
	}
}

async function handleResumeSession(session: { id: string; cwd: string }): Promise<void> {
	if (is_loading_session.value) return
	is_loading_session.value = true
	try {
		const data = await $fetch<{ id: string; cwd: string; messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> }>(`/api/ai/sessions/${session.id}`)
		resumeSession(data.id, data.cwd, data.messages)
		navigateTo('/ai')
	}
	catch (error) {
		console.error('Failed to load session:', error)
	}
	finally {
		is_loading_session.value = false
	}
}

async function confirmDelete(session: { id: string; project: string }): Promise<void> {
	id_deleting.value = session.id
	try {
		await $fetch(`/api/ai/sessions/${session.id}`, {
			method: 'DELETE',
			body: { project: session.project }
		})
		await Promise.all([refresh(), refreshArchive()])
	}
	catch (error) {
		console.error('Failed to delete session:', error)
	}
	finally {
		id_deleting.value = null
		id_confirm_delete.value = null
	}
}

function cancelDelete(): void {
	id_confirm_delete.value = null
}

async function handleBulkDelete(): Promise<void> {
	if (set_selected.value.size === 0) return
	is_bulk_deleting.value = true
	try {
		const sessions = list_sessions.value.filter(s => set_selected.value.has(s.id))
		await Promise.all(sessions.map(s =>
			$fetch(`/api/ai/sessions/${s.id}`, {
				method: 'DELETE',
				body: { project: s.project }
			})
		))
		clearSelection()
		await Promise.all([refresh(), refreshArchive()])
	}
	catch (error) {
		console.error('Bulk delete failed:', error)
	}
	finally {
		is_bulk_deleting.value = false
	}
}

async function handleRestore(item: { id: string; project: string }): Promise<void> {
	await $fetch('/api/ai/sessions/archive', {
		method: 'POST',
		body: { id: item.id, project: item.project }
	})
	await Promise.all([refresh(), refreshArchive()])
}

async function handleBulkRestore(): Promise<void> {
	if (set_archive_selected.value.size === 0) return
	const items = (list_archive.value ?? []).filter(s => set_archive_selected.value.has(s.id))
	await Promise.all(items.map(s =>
		$fetch('/api/ai/sessions/archive', {
			method: 'POST',
			body: { id: s.id, project: s.project }
		})
	))
	set_archive_selected.value = new Set()
	await Promise.all([refresh(), refreshArchive()])
}

async function handleDeletePermanently(item: { id: string; project: string }): Promise<void> {
	await $fetch('/api/ai/sessions/archive', {
		method: 'DELETE',
		body: { id: item.id, project: item.project }
	})
	await refreshArchive()
}

async function handleBulkDeletePermanently(): Promise<void> {
	if (set_archive_selected.value.size === 0) return
	is_bulk_archive_deleting.value = true
	try {
		const items = (list_archive.value ?? []).filter(s => set_archive_selected.value.has(s.id))
		await Promise.all(items.map(s =>
			$fetch('/api/ai/sessions/archive', {
				method: 'DELETE',
				body: { id: s.id, project: s.project }
			})
		))
		set_archive_selected.value = new Set()
		await refreshArchive()
	}
	catch (error) {
		console.error('Bulk permanent delete failed:', error)
	}
	finally {
		is_bulk_archive_deleting.value = false
	}
}

async function handleEmptyTrash(): Promise<void> {
	await $fetch('/api/ai/sessions/archive', { method: 'DELETE' })
	set_archive_selected.value = new Set()
	await refreshArchive()
}
</script>

<template>
	<UDashboardPanel id="session-manager">
		<template #header>
			<UDashboardNavbar>
				<template #leading>
					<div class="flex items-center gap-3">
						<UButton
							icon="i-lucide-arrow-left"
							color="neutral"
							variant="ghost"
							size="xs"
							to="/ai"
						/>
						<span class="font-semibold">Session Manager</span>
					</div>
				</template>
				<template #right>
					<span class="text-xs text-dimmed">
						{{ data.count_filtered }} of {{ data.count_total }} sessions
					</span>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="flex flex-col h-full">
				<!-- Tab bar -->
				<div class="flex items-center gap-1 px-4 pt-4 pb-2">
					<button
						class="px-3 py-1.5 text-sm rounded-lg transition-colors"
						:class="tab_active === 'active'
							? 'bg-primary/10 text-primary font-medium'
							: 'text-dimmed hover:bg-elevated/50'"
						@click="tab_active = 'active'"
					>
						Active
					</button>
					<button
						class="px-3 py-1.5 text-sm rounded-lg transition-colors"
						:class="tab_active === 'archive'
							? 'bg-primary/10 text-primary font-medium'
							: 'text-dimmed hover:bg-elevated/50'"
						@click="tab_active = 'archive'"
					>
						Archive
						<UBadge v-if="list_archive && list_archive.length > 0" color="neutral" variant="subtle" size="xs" class="ml-1">
							{{ list_archive.length }}
						</UBadge>
					</button>
				</div>

				<!-- Active tab -->
				<div v-if="tab_active === 'active'" class="flex-1 overflow-y-auto">
					<!-- Search + filter row -->
					<div class="flex items-center gap-3 px-4 py-3">
						<UInput
							v-model="query_search"
							icon="i-lucide-search"
							placeholder="Search sessions..."
							class="flex-1"
							size="sm"
						/>
						<select
							v-model="filter_project"
							class="h-8 rounded-md border border-default bg-default text-sm px-2 pr-7 outline-none text-dimmed appearance-none cursor-pointer"
						>
							<option value="">
								All projects
							</option>
							<option v-for="project in list_projects" :key="project" :value="project">
								{{ project }}
							</option>
						</select>
					</div>

					<!-- Bulk actions bar -->
					<div
						v-if="set_selected.size > 0"
						class="flex items-center gap-3 px-4 py-2 bg-primary/5 border-y border-primary/10"
					>
						<UCheckbox
							:model-value="is_all_selected"
							@update:model-value="toggleSelectAll"
						/>
						<span class="text-xs font-medium">{{ set_selected.size }} selected</span>
						<div class="flex-1" />
						<UButton
							label="Archive"
							icon="i-lucide-archive"
							color="error"
							variant="soft"
							size="xs"
							:loading="is_bulk_deleting"
							@click="handleBulkDelete"
						/>
						<UButton
							label="Clear"
							color="neutral"
							variant="ghost"
							size="xs"
							@click="clearSelection"
						/>
					</div>

					<!-- Loading state -->
					<div v-if="status === 'pending'" class="px-4 space-y-2">
						<div v-for="i in 6" :key="i" class="h-12 rounded-lg bg-elevated/30 animate-pulse" />
					</div>

					<!-- Session list -->
					<div v-else-if="list_sessions.length > 0" class="px-4 pb-4 space-y-1">
						<!-- Select all row (when no selection yet) -->
						<div v-if="set_selected.size === 0" class="flex items-center gap-2 px-3 py-1">
							<UCheckbox
								:model-value="false"
								@update:model-value="toggleSelectAll"
							/>
							<span class="text-[10px] text-dimmed/50">Select all</span>
						</div>

						<div
							v-for="session in list_sessions"
							:key="session.id"
							class="relative"
						>
							<!-- Confirm delete overlay -->
							<div
								v-if="id_confirm_delete === session.id"
								class="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/20"
							>
								<span class="text-xs text-error flex-1">Archive this session?</span>
								<UButton
									label="Cancel"
									color="neutral"
									variant="ghost"
									size="xs"
									@click="cancelDelete"
								/>
								<UButton
									label="Archive"
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
								:class="set_selected.has(session.id) ? 'bg-primary/5' : ''"
							>
								<UCheckbox
									:model-value="set_selected.has(session.id)"
									@click.stop
									@update:model-value="toggleSelect(session.id)"
								/>
								<div
									class="flex-1 flex items-center gap-3 min-w-0"
									@click="handleResumeSession(session)"
								>
									<UIcon name="i-lucide-message-square" class="size-3.5 text-dimmed shrink-0 group-hover:text-primary transition-colors" />
									<span class="flex-1 truncate">{{ session.title || 'Untitled session' }}</span>
									<UBadge color="neutral" variant="subtle" size="xs" class="shrink-0">
										{{ session.project }}
									</UBadge>
									<span class="text-[10px] text-dimmed/50 shrink-0 font-mono">{{ formatCwd(session.cwd) }}</span>
									<span class="text-[10px] text-dimmed/50 shrink-0">{{ formatTimeAgo(session.time_modified) }}</span>
								</div>
								<button
									class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-error/10 text-dimmed hover:text-error"
									title="Archive session"
									@click.stop="id_confirm_delete = session.id"
								>
									<UIcon name="i-lucide-archive" class="size-3.5" />
								</button>
							</div>
						</div>
					</div>

					<!-- Empty state -->
					<div v-else class="flex flex-col items-center justify-center py-16 text-center">
						<UIcon name="i-lucide-inbox" class="size-10 text-dimmed/30 mb-3" />
						<p class="text-sm text-dimmed">
							No sessions found
						</p>
						<p class="text-xs text-dimmed/50 mt-1">
							{{ query_search || filter_project ? 'Try adjusting your search or filter' : 'Start a conversation in Claude Code to see sessions here' }}
						</p>
					</div>
				</div>

				<!-- Archive tab -->
				<div v-else class="flex-1 overflow-y-auto">
					<!-- Archive header -->
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-xs text-dimmed">
							{{ list_archive?.length ?? 0 }} archived sessions
						</span>
						<div class="flex items-center gap-2">
							<UButton
								v-if="set_archive_selected.size > 0"
								:label="`Restore ${set_archive_selected.size}`"
								icon="i-lucide-undo-2"
								color="neutral"
								variant="soft"
								size="xs"
								@click="handleBulkRestore"
							/>
							<UButton
								v-if="set_archive_selected.size > 0"
								:label="`Delete ${set_archive_selected.size}`"
								icon="i-lucide-trash-2"
								color="error"
								variant="soft"
								size="xs"
								:loading="is_bulk_archive_deleting"
								@click="handleBulkDeletePermanently"
							/>
							<UButton
								v-if="list_archive && list_archive.length > 0"
								label="Empty trash"
								icon="i-lucide-trash-2"
								color="error"
								variant="ghost"
								size="xs"
								@click="handleEmptyTrash"
							/>
						</div>
					</div>

					<!-- Archive list -->
					<div v-if="list_archive && list_archive.length > 0" class="px-4 pb-4 space-y-1">
						<!-- Select all row -->
						<div class="flex items-center gap-2 px-3 py-1">
							<UCheckbox
								:model-value="is_all_archive_selected"
								@update:model-value="toggleArchiveSelectAll"
							/>
							<span class="text-[10px] text-dimmed/50">Select all</span>
						</div>

						<div
							v-for="item in list_archive"
							:key="item.id"
							class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-elevated/50 transition-colors"
							:class="set_archive_selected.has(item.id) ? 'bg-primary/5' : ''"
						>
							<UCheckbox
								:model-value="set_archive_selected.has(item.id)"
								@update:model-value="toggleArchiveSelect(item.id)"
							/>
							<UIcon name="i-lucide-archive" class="size-3.5 text-dimmed shrink-0" />
							<span class="flex-1 truncate">{{ item.title || 'Untitled session' }}</span>
							<UBadge color="neutral" variant="subtle" size="xs" class="shrink-0">
								{{ item.project }}
							</UBadge>
							<span class="text-[10px] text-dimmed/50 shrink-0">deleted {{ formatTimeAgo(item.deleted_at) }}</span>
							<UButton
								label="Restore"
								icon="i-lucide-undo-2"
								color="neutral"
								variant="ghost"
								size="xs"
								@click="handleRestore(item)"
							/>
							<UButton
								icon="i-lucide-x"
								color="error"
								variant="ghost"
								size="xs"
								title="Delete permanently"
								@click="handleDeletePermanently(item)"
							/>
						</div>
					</div>

					<!-- Empty archive state -->
					<div v-else class="flex flex-col items-center justify-center py-16 text-center">
						<UIcon name="i-lucide-trash-2" class="size-10 text-dimmed/30 mb-3" />
						<p class="text-sm text-dimmed">
							Trash is empty
						</p>
						<p class="text-xs text-dimmed/50 mt-1">
							Deleted sessions will appear here
						</p>
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
