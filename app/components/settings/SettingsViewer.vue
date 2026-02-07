<script setup lang="ts">
defineProps<{
	settings_global: Record<string, unknown> | null
	settings_local: Record<string, unknown> | null
}>()

function formatJson(obj: Record<string, unknown> | null): string {
	if (!obj) return '(not found)'
	return JSON.stringify(obj, null, 2)
}
</script>

<template>
	<UTabs
		:items="[
			{ label: 'Global (settings.json)', slot: 'global' },
			{ label: 'Local (settings.local.json)', slot: 'local' },
		]"
	>
		<template #global>
			<UCard class="mt-4">
				<CodeViewer
					v-if="settings_global"
					:content="formatJson(settings_global)"
					language="json"
				/>
				<div v-else class="text-sm text-dimmed p-4">
					No global settings file found.
				</div>
			</UCard>
		</template>

		<template #local>
			<UCard class="mt-4">
				<CodeViewer
					v-if="settings_local"
					:content="formatJson(settings_local)"
					language="json"
				/>
				<div v-else class="text-sm text-dimmed p-4">
					No local settings file found.
				</div>
			</UCard>
		</template>
	</UTabs>
</template>
