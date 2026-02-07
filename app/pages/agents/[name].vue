<script setup lang="ts">
const route = useRoute()
const name_agent = route.params.name as string

useSeoMeta({ title: `Agent: ${name_agent}` })

const { data, status } = useFetch(`/api/agents/${name_agent}`)
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
				<AgentDetail v-else-if="data" :agent="data" />
			</div>
		</template>
	</UDashboardPanel>
</template>
