<script setup lang="ts">
useSeoMeta({ title: 'CLAUDE.md' })

const { data, status, refresh } = useFetch('/api/claude-md')

async function handleSave(content: string): Promise<void> {
	await $fetch('/api/claude-md', {
		method: 'PUT',
		body: { content_raw: content }
	})
	await refresh()
}
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
						:can_edit="true"
						@save="handleSave"
					/>
				</UCard>
				<div v-else class="text-sm text-dimmed">
					No CLAUDE.md file found.
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
