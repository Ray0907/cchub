<script setup lang="ts">
useSeoMeta({ title: 'Hooks' })

const { data, status, refresh } = useFetch('/api/hooks')
const error_parse = ref('')

async function handleSaveScript(payload: { name_file: string; content_raw: string }): Promise<void> {
	await $fetch(`/api/hooks/${payload.name_file}`, {
		method: 'PUT',
		body: { content_raw: payload.content_raw }
	})
	await refresh()
}

async function handleSaveConfig(content: string): Promise<void> {
	error_parse.value = ''
	let hooks_data: unknown
	try {
		hooks_data = JSON.parse(content)
	}
	catch (err) {
		error_parse.value = `Invalid JSON: ${(err as Error).message}`
		return
	}

	const settings = await $fetch<{ settings_global: Record<string, unknown> }>('/api/settings')
	const updated = { ...settings.settings_global, hooks: hooks_data }
	await $fetch('/api/settings', {
		method: 'PUT',
		body: { type: 'global', data: updated }
	})
	await refresh()
}
</script>

<template>
	<UDashboardPanel id="hooks">
		<template #header>
			<UDashboardNavbar title="Hooks">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6 space-y-6">
				<div v-if="error_parse" class="px-4 py-2 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
					{{ error_parse }}
				</div>

				<div v-if="status === 'pending'" class="space-y-4">
					<USkeleton class="h-32" />
					<USkeleton class="h-32" />
				</div>
				<template v-else-if="data">
					<div>
						<h3 class="text-sm font-medium text-dimmed mb-3">Script Files</h3>
						<HookScripts
							:scripts="data.list_scripts"
							:can_edit="true"
							@save="handleSaveScript"
						/>
					</div>
					<div>
						<h3 class="text-sm font-medium text-dimmed mb-3">Configuration</h3>
						<HookConfig
							:config="data.config_hooks"
							:can_edit="true"
							@save="handleSaveConfig"
						/>
					</div>
				</template>
			</div>
		</template>
	</UDashboardPanel>
</template>
