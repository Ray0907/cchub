<script setup lang="ts">
const route = useRoute()
const name_agent = route.params.name as string

useSeoMeta({ title: `Agent: ${name_agent}` })

const { data, status, refresh } = useFetch(`/api/agents/${name_agent}`)

async function handleSave(content: string): Promise<void> {
	await $fetch(`/api/agents/${name_agent}`, {
		method: 'PUT',
		body: {
			frontmatter: {
				description: data.value?.description ?? '',
				model: data.value?.model ?? '',
				tools: data.value?.tools ?? [],
			},
			content_body: content,
		}
	})
	await refresh()
}
</script>

<template>
	<UDashboardPanel id="agent-detail">
		<template #header>
			<UDashboardNavbar :title="`Agent: ${name_agent}`">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-4">
					<USkeleton class="h-8 w-48" />
					<USkeleton class="h-4 w-96" />
					<USkeleton class="h-64" />
				</div>
				<AgentDetail
					v-else-if="data"
					:agent="data"
					:can_edit="true"
					@save="handleSave"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
