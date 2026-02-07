<script setup lang="ts">
useSeoMeta({ title: 'CLAUDE.md' })

const { data, status } = useFetch('/api/claude-md')
</script>

<template>
	<UDashboardPanel id="claude-md">
		<template #header>
			<UDashboardNavbar title="CLAUDE.md">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<div v-if="status === 'pending'" class="space-y-4">
					<USkeleton class="h-64" />
				</div>
				<UCard v-else-if="data">
					<MarkdownViewer
						:content_raw="data.content_raw"
					/>
				</UCard>
				<div v-else class="text-sm text-dimmed">
					No CLAUDE.md file found.
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
