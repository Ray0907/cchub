<script setup lang="ts">
useSeoMeta({ title: 'History' })

const query_search = ref('')
const query_debounced = refDebounced(query_search, 300)
const tab_active = ref<'active' | 'archive'>('active')
const page_current = ref(1)
const SIZE_PAGE = 50
const el_table = ref<HTMLElement | null>(null)

function scrollToTable(): void {
	nextTick(() => {
		el_table.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	})
}

watch(page_current, () => {
	scrollToTable()
})

const url_params = computed(() => ({
	q: query_debounced.value || undefined,
	limit: SIZE_PAGE,
	offset: (page_current.value - 1) * SIZE_PAGE,
}))

const { data, status, refresh } = useFetch('/api/history', {
	query: url_params,
	watch: [url_params],
})

const { data: list_archive, refresh: refreshArchive } = useFetch('/api/history/archive', {
	default: () => [] as Array<Record<string, unknown>>
})

const list_entries = computed(() => data.value?.list_entries ?? [])

const is_bulk_archiving = ref(false)
const is_bulk_archive_deleting = ref(false)

const select_active = useMultiSelect()
const select_archive = useMultiSelect()

const is_all_selected = computed(() =>
	select_active.isAllSelected(list_entries.value.length)
)

const is_all_archive_selected = computed(() =>
	select_archive.isAllSelected(list_archive.value?.length ?? 0)
)

function toggleSelectAll(): void {
	if (is_all_selected.value) select_active.clearAll()
	else select_active.selectAll(list_entries.value.map(e => String(e.timestamp ?? '')))
}

function toggleArchiveSelectAll(): void {
	if (is_all_archive_selected.value) select_archive.clearAll()
	else select_archive.selectAll((list_archive.value ?? []).map(e => String(e.timestamp ?? '')))
}

watch(query_debounced, () => {
	select_active.clearAll()
	page_current.value = 1
})

async function handleBulkArchive(): Promise<void> {
	if (select_active.set_selected.value.size === 0) return
	is_bulk_archiving.value = true
	try {
		await $fetch('/api/history/archive', {
			method: 'POST',
			body: { list_timestamps: [...select_active.set_selected.value] }
		})
		select_active.clearAll()
		await Promise.all([refresh(), refreshArchive()])
	}
	catch (error) {
		console.error('Bulk archive failed:', error)
	}
	finally {
		is_bulk_archiving.value = false
	}
}

async function handleRestore(entry: Record<string, unknown>): Promise<void> {
	await $fetch('/api/history/archive', {
		method: 'PUT',
		body: { list_timestamps: [String(entry.timestamp)] }
	})
	await Promise.all([refresh(), refreshArchive()])
}

async function handleBulkRestore(): Promise<void> {
	if (select_archive.set_selected.value.size === 0) return
	await $fetch('/api/history/archive', {
		method: 'PUT',
		body: { list_timestamps: [...select_archive.set_selected.value] }
	})
	select_archive.clearAll()
	await Promise.all([refresh(), refreshArchive()])
}

async function handleDeletePermanently(entry: Record<string, unknown>): Promise<void> {
	await $fetch('/api/history/archive', {
		method: 'DELETE',
		body: { list_timestamps: [String(entry.timestamp)] }
	})
	await refreshArchive()
}

async function handleBulkDeletePermanently(): Promise<void> {
	if (select_archive.set_selected.value.size === 0) return
	is_bulk_archive_deleting.value = true
	try {
		await $fetch('/api/history/archive', {
			method: 'DELETE',
			body: { list_timestamps: [...select_archive.set_selected.value] }
		})
		select_archive.clearAll()
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
	await $fetch('/api/history/archive', {
		method: 'DELETE',
		body: { delete_all: true }
	})
	select_archive.clearAll()
	await refreshArchive()
}

</script>

<template>
	<UDashboardPanel id="history">
		<template #header>
			<UDashboardNavbar title="History">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<span v-if="data" class="text-xs text-dimmed">
						{{ data.count_total }} entries
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
						<UBadge v-if="list_archive && list_archive.length > 0" color="neutral" variant="subtle" size="sm" class="ml-1">
							{{ list_archive.length }}
						</UBadge>
					</button>
				</div>

				<!-- Active tab -->
				<div v-if="tab_active === 'active'" class="flex-1 overflow-y-auto">
					<div class="p-4 space-y-4">
						<HistorySearch v-model:query="query_search" />

						<!-- Bulk actions bar -->
						<div
							v-if="select_active.set_selected.value.size > 0"
							class="flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/10 rounded-lg"
						>
							<UCheckbox
								:model-value="is_all_selected"
								@update:model-value="toggleSelectAll"
							/>
							<span class="text-xs font-medium">{{ select_active.set_selected.value.size }} selected</span>
							<div class="flex-1" />
							<UButton
								label="Archive"
								icon="i-lucide-archive"
								color="error"
								variant="soft"
								size="sm"
								:loading="is_bulk_archiving"
								@click="handleBulkArchive"
							/>
							<UButton
								label="Clear"
								color="neutral"
								variant="ghost"
								size="sm"
								@click="select_active.clearAll"
							/>
						</div>

						<div v-if="status === 'pending' && !data" class="space-y-2">
							<USkeleton v-for="i in 8" :key="i" class="h-11" />
						</div>
						<template v-else-if="data">
							<!-- Top pagination -->
							<div v-if="data.count_total > SIZE_PAGE" class="flex justify-center pb-2">
								<UPagination
									v-model:page="page_current"
									:items-per-page="SIZE_PAGE"
									:total="data.count_total"
								/>
							</div>

							<!-- Select all row (when no selection yet) -->
							<div v-if="select_active.set_selected.value.size === 0 && list_entries.length > 0" class="flex items-center gap-2 px-3 py-1">
								<UCheckbox
									:model-value="false"
									@update:model-value="toggleSelectAll"
								/>
								<span class="text-[10px] text-dimmed/50">Select all</span>
							</div>

							<div ref="el_table">
								<HistoryTable
									:entries="list_entries"
									:selectable="true"
									:selected="select_active.set_selected.value"
									@toggle="select_active.toggleItem"
								/>
							</div>

							<!-- Bottom pagination -->
							<div v-if="data.count_total > SIZE_PAGE" class="flex justify-center pt-2">
								<UPagination
									v-model:page="page_current"
									:items-per-page="SIZE_PAGE"
									:total="data.count_total"
								/>
							</div>
						</template>
					</div>
				</div>

				<!-- Archive tab -->
				<div v-else class="flex-1 overflow-y-auto">
					<!-- Archive header -->
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-xs text-dimmed">
							{{ list_archive?.length ?? 0 }} archived entries
						</span>
						<div class="flex items-center gap-2">
							<UButton
								v-if="select_archive.set_selected.value.size > 0"
								:label="`Restore ${select_archive.set_selected.value.size}`"
								icon="i-lucide-undo-2"
								color="neutral"
								variant="soft"
								size="sm"
								@click="handleBulkRestore"
							/>
							<UButton
								v-if="select_archive.set_selected.value.size > 0"
								:label="`Delete ${select_archive.set_selected.value.size}`"
								icon="i-lucide-trash-2"
								color="error"
								variant="soft"
								size="sm"
								:loading="is_bulk_archive_deleting"
								@click="handleBulkDeletePermanently"
							/>
							<UButton
								v-if="list_archive && list_archive.length > 0"
								label="Empty trash"
								icon="i-lucide-trash-2"
								color="error"
								variant="ghost"
								size="sm"
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
							:key="String(item.timestamp)"
							class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-elevated/50 transition-colors"
							:class="select_archive.set_selected.value.has(String(item.timestamp)) ? 'bg-primary/5' : ''"
						>
							<UCheckbox
								:model-value="select_archive.set_selected.value.has(String(item.timestamp))"
								@update:model-value="select_archive.toggleItem(String(item.timestamp))"
							/>
							<UIcon name="i-lucide-archive" class="size-3.5 text-dimmed shrink-0" />
							<span class="flex-1 truncate">{{ extractMessage(item) }}</span>
							<span class="w-40 text-xs text-dimmed shrink-0 text-right hidden sm:inline">deleted {{ formatHistoryTimeAgo(item._deleted_at) }}</span>
							<UButton
								label="Restore"
								icon="i-lucide-undo-2"
								color="neutral"
								variant="ghost"
								size="sm"
								@click="handleRestore(item)"
							/>
							<UButton
								icon="i-lucide-x"
								color="error"
								variant="ghost"
								size="sm"
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
							Archived history entries will appear here
						</p>
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
