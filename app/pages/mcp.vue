<script setup lang="ts">
useSeoMeta({ title: 'MCP' })

const { data, status } = useFetch('/api/mcp')

const list_servers = computed(() => {
	if (!data.value?.servers) return []
	return Object.entries(data.value.servers).map(([name, config]) => ({
		name_server: name,
		server: config as Record<string, unknown>
	}))
})
</script>

<template>
	<UDashboardPanel id="mcp">
		<template #header>
			<UDashboardNavbar title="MCP Servers">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<USkeleton v-for="i in 4" :key="i" class="h-40" />
				</div>
				<div v-else-if="list_servers.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<McpServerCard
						v-for="item in list_servers"
						:key="item.name_server"
						:name_server="item.name_server"
						:server="item.server"
					/>
				</div>
				<div v-else class="text-sm text-dimmed">
					No MCP servers configured.
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
