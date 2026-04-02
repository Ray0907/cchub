<script setup lang="ts">
withDefaults(defineProps<{
	settings_global: Record<string, unknown> | null
	settings_local: Record<string, unknown> | null
	can_edit?: boolean
}>(), {
	can_edit: false
})

const emit = defineEmits<{
	save: [payload: { type: string; data: object }]
}>()

const error_parse = ref('')

function formatJson(obj: Record<string, unknown> | null): string {
	if (!obj) return '(not found)'
	return JSON.stringify(obj, null, 2)
}

function handleSave(type: string, content: string): void {
	error_parse.value = ''
	try {
		const data = JSON.parse(content)
		emit('save', { type, data })
	}
	catch (err) {
		error_parse.value = `Invalid JSON: ${(err as Error).message}`
	}
}
</script>

<template>
	<div>
		<div v-if="error_parse" class="mb-4 px-4 py-2 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
			{{ error_parse }}
		</div>

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
						:can_edit="can_edit"
						@save="handleSave('global', $event)"
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
						:can_edit="can_edit"
						@save="handleSave('local', $event)"
					/>
					<div v-else class="text-sm text-dimmed p-4">
						No local settings file found.
					</div>
				</UCard>
			</template>
		</UTabs>
	</div>
</template>
