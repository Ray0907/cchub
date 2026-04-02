<script setup lang="ts">
useSeoMeta({ title: 'Plugins' })

const { data, status } = useFetch('/api/plugins')
</script>

<template>
	<UDashboardPanel id="plugins">
		<template #header>
			<UDashboardNavbar title="Plugins">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-2">
					<USkeleton v-for="i in 4" :key="i" class="h-12" />
				</div>
				<PluginTable v-else-if="data" :items="data" />
			</div>
		</template>
	</UDashboardPanel>
</template>
