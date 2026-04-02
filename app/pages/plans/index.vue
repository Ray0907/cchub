<script setup lang="ts">
useSeoMeta({ title: 'Plans' })

const { data, status } = useFetch('/api/plans')

function formatTime(iso: string) {
	return new Date(iso).toLocaleString('en-US')
}
</script>

<template>
	<UDashboardPanel id="plans">
		<template #header>
			<UDashboardNavbar title="Plans">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-2">
					<USkeleton v-for="i in 4" :key="i" class="h-14" />
				</div>
				<div v-else-if="data?.length" class="space-y-2">
					<UCard
						v-for="plan in data"
						:key="plan.name_file"
						class="hover:ring-primary/50 hover:ring-1 transition-all cursor-pointer"
						@click="navigateTo(`/plans/${plan.name_file.replace(/\.md$/, '')}`)"
					>
						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<h3 class="text-sm font-semibold">{{ plan.name_plan }}</h3>
								<p v-if="plan.description" class="text-xs text-dimmed">
									{{ plan.description }}
								</p>
							</div>
							<span class="text-xs text-dimmed shrink-0">
								{{ formatTime(plan.time_modified) }}
							</span>
						</div>
					</UCard>
				</div>
				<div v-else class="text-sm text-dimmed">
					No plans found.
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
