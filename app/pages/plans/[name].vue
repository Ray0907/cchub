<script setup lang="ts">
const route = useRoute()
const name_plan = route.params.name as string

useSeoMeta({ title: `Plan: ${name_plan}` })

const { data, status } = useFetch(`/api/plans/${name_plan}`)
</script>

<template>
	<UDashboardPanel id="plan-detail">
		<template #header>
			<UDashboardNavbar :title="`Plan: ${name_plan}`">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-4">
					<USkeleton class="h-8 w-48" />
					<USkeleton class="h-64" />
				</div>
				<div v-else-if="data" class="space-y-4">
					<div class="flex items-center gap-3">
						<UButton
							icon="i-lucide-arrow-left"
							color="neutral"
							variant="ghost"
							size="sm"
							to="/plans"
						/>
						<h2 class="text-lg font-semibold">{{ data.name_plan }}</h2>
						<span v-if="data.time_modified" class="text-xs text-dimmed">
							{{ new Date(data.time_modified).toLocaleString('en-US') }}
						</span>
					</div>
					<UCard>
						<MarkdownViewer
							:content_raw="data.content_raw"
						/>
					</UCard>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
