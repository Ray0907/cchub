<script setup lang="ts">
const route = useRoute()
const name_session = route.params.name as string

useSeoMeta({ title: `Session: ${name_session}` })

const { data, status } = useFetch(`/api/sessions/${name_session}`)
</script>

<template>
	<UDashboardPanel id="session-detail">
		<template #header>
			<UDashboardNavbar :title="`Session: ${name_session}`">
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
							to="/sessions"
						/>
						<h2 class="text-lg font-semibold font-mono">{{ data.name_file }}</h2>
						<span v-if="data.time_modified" class="text-xs text-dimmed">
							{{ new Date(data.time_modified).toLocaleString('en-US') }}
						</span>
					</div>
					<UCard>
						<CodeViewer :content="data.content_raw" language="text" />
					</UCard>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
