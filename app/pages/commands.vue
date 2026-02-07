<script setup lang="ts">
useSeoMeta({ title: 'Commands' })

const { data, status, refresh } = useFetch('/api/commands')

const list_items = computed(() => {
	if (!data.value) return []
	return data.value.map(cmd => ({
		label: cmd.name_command,
		icon: 'i-lucide-terminal' as const,
		description: cmd.description,
		content_raw: cmd.content_raw,
		name_command: cmd.name_command,
	}))
})

async function handleSave(name_command: string, content: string): Promise<void> {
	await $fetch(`/api/commands/${name_command}`, {
		method: 'PUT',
		body: { content_raw: content }
	})
	await refresh()
}
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
							<MarkdownViewer
								:content_raw="item.content_raw"
								:can_edit="true"
								@save="handleSave(item.name_command, $event)"
							/>
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
