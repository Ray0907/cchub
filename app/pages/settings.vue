<script setup lang="ts">
useSeoMeta({ title: 'Settings' })

const { data, status } = useFetch('/api/settings')
</script>

<template>
	<UDashboardPanel id="settings">
		<template #header>
			<UDashboardNavbar title="Settings">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-4">
					<USkeleton class="h-10 w-64" />
					<USkeleton class="h-64" />
				</div>
				<SettingsViewer
					v-else-if="data"
					:settings_global="data.settings_global"
					:settings_local="data.settings_local"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
