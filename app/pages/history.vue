<script setup lang="ts">
useSeoMeta({ title: 'History' })

const query_search = ref('')
const limit = ref(50)
const offset = ref(0)

const query_debounced = refDebounced(query_search, 300)

const url_params = computed(() => ({
	q: query_debounced.value || undefined,
	limit: limit.value,
	offset: offset.value,
}))

const { data, status } = useFetch('/api/history', {
	query: url_params,
	watch: [url_params],
})

const list_all = ref<Record<string, unknown>[]>([])

watch(data, (val) => {
	if (!val) return
	if (offset.value === 0) {
		list_all.value = val.list_entries
	} else {
		list_all.value = [...list_all.value, ...val.list_entries]
	}
}, { immediate: true })

watch(query_debounced, () => {
	offset.value = 0
	list_all.value = []
})

function loadMore() {
	offset.value = list_all.value.length
}
</script>

<template>
	<UDashboardPanel id="history">
		<template #header>
			<UDashboardNavbar title="History">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6 space-y-4">
				<HistorySearch v-model:query="query_search" />

				<div v-if="status === 'pending' && !list_all.length" class="space-y-2">
					<USkeleton v-for="i in 6" :key="i" class="h-12" />
				</div>
				<HistoryTable
					v-else-if="data"
					:entries="list_all"
					:count_total="data.count_total"
					@load-more="loadMore"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
