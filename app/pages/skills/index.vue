<script setup lang="ts">
useSeoMeta({ title: 'Skills' })

const { data, status } = useFetch('/api/skills')
</script>

<template>
	<UDashboardPanel id="skills">
		<template #header>
			<UDashboardNavbar title="Skills">
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
				<SkillList v-else-if="data" :items="data" />
			</div>
		</template>
	</UDashboardPanel>
</template>
