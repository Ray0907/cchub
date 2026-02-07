<script setup lang="ts">
useSeoMeta({ title: 'Commands' })

const { data, status } = useFetch('/api/commands')

const list_items = computed(() => {
	if (!data.value) return []
	return data.value.map(cmd => ({
		label: cmd.name_command,
		icon: 'i-lucide-terminal' as const,
		description: cmd.description,
		content_raw: cmd.content_raw,
	}))
})
</script>

<template>
	<UDashboardPanel id="commands">
		<template #header>
			<UDashboardNavbar title="Commands">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-2">
					<USkeleton v-for="i in 4" :key="i" class="h-14" />
				</div>
				<div v-else-if="list_items.length" class="space-y-3">
					<UAccordion :items="list_items" type="multiple">
						<template #body="{ item }">
							<MDC :value="item.content_raw" tag="article" class="prose prose-sm dark:prose-invert max-w-none p-4" />
						</template>
					</UAccordion>
				</div>
				<div v-else class="text-sm text-dimmed">
					No commands found.
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
