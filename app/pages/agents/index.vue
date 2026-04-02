<script setup lang="ts">
useSeoMeta({ title: 'Agents' })

const { data, status } = useFetch('/api/agents')
</script>

<template>
	<UDashboardPanel id="agents">
		<template #header>
			<UDashboardNavbar title="Agents">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<USkeleton v-for="i in 6" :key="i" class="h-32" />
				</div>
				<AgentList v-else-if="data" :items="data" />
			</div>
		</template>
	</UDashboardPanel>
</template>
