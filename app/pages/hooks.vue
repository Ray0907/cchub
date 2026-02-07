<script setup lang="ts">
useSeoMeta({ title: 'Hooks' })

const { data, status } = useFetch('/api/hooks')
</script>

<template>
	<UDashboardPanel id="hooks">
		<template #header>
			<UDashboardNavbar title="Hooks">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6 space-y-6">
				<div v-if="status === 'pending'" class="space-y-4">
					<USkeleton class="h-32" />
					<USkeleton class="h-32" />
				</div>
				<template v-else-if="data">
					<div>
						<h3 class="text-sm font-medium text-dimmed mb-3">Script Files</h3>
						<HookScripts :scripts="data.list_scripts" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-dimmed mb-3">Configuration</h3>
						<HookConfig :config="data.config_hooks" />
					</div>
				</template>
			</div>
		</template>
	</UDashboardPanel>
</template>
