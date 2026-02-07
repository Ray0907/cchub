<script setup lang="ts">
useSeoMeta({ title: 'Rules' })

const route = useRoute()

const slug = computed(() => {
	const raw = route.params.slug
	if (Array.isArray(raw)) return raw.join('/')
	return raw || ''
})

const { data: tree_data, status: status_tree } = useFetch('/api/rules')

const { data: rule_data, status: status_rule } = useFetch(
	() => slug.value ? `/api/rules/${slug.value}` : '',
	{ watch: [slug], immediate: !!slug.value }
)

const has_slug = computed(() => !!slug.value)
</script>

<template>
	<UDashboardPanel id="rules">
		<template #header>
			<UDashboardNavbar title="Rules">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="flex h-full">
				<div class="w-64 shrink-0 border-r border-default overflow-y-auto p-4">
					<div v-if="status_tree === 'pending'">
						<USkeleton v-for="i in 8" :key="i" class="h-6 mb-2" />
					</div>
					<RuleTree v-else-if="tree_data?.tree" :nodes="tree_data.tree" />
				</div>

				<div class="flex-1 overflow-y-auto p-6">
					<template v-if="has_slug">
						<div v-if="status_rule === 'pending'" class="space-y-4">
							<USkeleton class="h-8 w-48" />
							<USkeleton class="h-64" />
						</div>
						<RuleViewer v-else-if="rule_data" :rule="rule_data" />
					</template>
					<div v-else class="flex items-center justify-center h-full text-dimmed text-sm">
						Select a rule from the tree to view its content.
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
