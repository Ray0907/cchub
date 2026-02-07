<script setup lang="ts">
const route = useRoute()
const name_skill = route.params.name as string

useSeoMeta({ title: `Skill: ${name_skill}` })

const { data, status } = useFetch(`/api/skills/${name_skill}`)
</script>

<template>
	<UDashboardPanel id="skill-detail">
		<template #header>
			<UDashboardNavbar :title="`Skill: ${name_skill}`">
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
				<SkillDetail v-else-if="data" :skill="data" />
			</div>
		</template>
	</UDashboardPanel>
</template>
