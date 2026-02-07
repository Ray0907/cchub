<script setup lang="ts">
useSeoMeta({ title: 'Sessions' })

const { data, status } = useFetch('/api/sessions')
</script>

<template>
	<UDashboardPanel id="sessions">
		<template #header>
			<UDashboardNavbar title="Sessions">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-2">
					<USkeleton v-for="i in 6" :key="i" class="h-14" />
				</div>
				<SessionList v-else-if="data" :items="data" />
			</div>
		</template>
	</UDashboardPanel>
</template>
