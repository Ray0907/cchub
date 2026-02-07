<script setup lang="ts">
useSeoMeta({ title: 'Teams' })

interface TeamRow {
	name_team: string
	name_dir: string
	config: Record<string, unknown> | null
}

const { data, status } = useFetch<TeamRow[]>('/api/teams')

function formatConfig(config: Record<string, unknown> | null): string {
	if (!config) return '(no config)'
	return JSON.stringify(config, null, 2)
}
</script>

<template>
	<UDashboardPanel id="teams">
		<template #header>
			<UDashboardNavbar title="Teams">
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
				<div v-else-if="data?.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<UCard v-for="team in data" :key="team.name_dir">
						<template #header>
							<div class="flex items-center gap-2">
								<UIcon name="i-lucide-users" class="size-4 text-primary" />
								<h3 class="font-semibold text-sm">{{ team.name_team }}</h3>
							</div>
						</template>
						<CodeViewer
							v-if="team.config"
							:content="formatConfig(team.config)"
							language="json"
						/>
						<div v-else class="text-sm text-dimmed">
							No configuration file found.
						</div>
					</UCard>
				</div>
				<div v-else class="text-sm text-dimmed">
					No teams found.
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
