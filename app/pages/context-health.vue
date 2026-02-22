<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ContextHealthResponse, ContextSuggestion, PluginHealthItem } from '~/types'

useSeoMeta({ title: 'Context Health' })

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const { data, status, refresh } = useFetch<ContextHealthResponse>('/api/context-health')

const is_toggling = ref<string | null>(null)

async function togglePlugin(id_plugin: string, is_enabled: boolean): Promise<void> {
	is_toggling.value = id_plugin
	try {
		await $fetch('/api/plugins/toggle', {
			method: 'POST',
			body: { id_plugin, is_enabled }
		})
		await refresh()
	}
	finally {
		is_toggling.value = null
	}
}

async function applySuggestion(suggestion: ContextSuggestion): Promise<void> {
	if (suggestion.action_type === 'disable_plugin' && suggestion.action_target) {
		await togglePlugin(suggestion.action_target, false)
	}
}

const list_stats = computed(() => {
	if (!data.value) return []
	return [
		{
			key: 'tokens',
			label: 'Est. Tokens',
			value: formatCompact(data.value.tokens_estimated),
			icon: 'i-lucide-binary',
		},
		{
			key: 'plugins',
			label: 'Plugins Enabled',
			value: String(data.value.count_plugins_enabled),
			icon: 'i-lucide-puzzle',
		},
		{
			key: 'skills',
			label: 'Skills in Context',
			value: String(data.value.count_skills_total),
			icon: 'i-lucide-zap',
		},
		{
			key: 'rules',
			label: 'Rule Files',
			value: String(data.value.count_rules),
			icon: 'i-lucide-scale',
		},
	]
})

const set_duplicate_plugins = computed(() => {
	if (!data.value) return new Set<string>()
	return new Set(data.value.list_duplicates.flatMap(dup => dup.list_sources))
})

const columns_plugins: TableColumn<PluginHealthItem>[] = [
	{
		accessorKey: 'name_plugin',
		header: 'Plugin',
		cell: ({ row }) => {
			const plugin = row.original
			const is_dup = set_duplicate_plugins.value.has(plugin.id_plugin)
			const children = [
				h('span', { class: 'font-mono text-sm' }, plugin.name_plugin),
			]
			if (is_dup) {
				children.push(h(UBadge, {
					color: 'error',
					variant: 'subtle',
					size: 'xs',
					class: 'ml-2',
				}, () => 'Duplicate'))
			}
			if (plugin.count_skills === 0 && plugin.is_enabled) {
				children.push(h(UBadge, {
					color: 'neutral',
					variant: 'subtle',
					size: 'xs',
					class: 'ml-2',
				}, () => '0 skills'))
			}
			return h('div', { class: 'flex items-center gap-1 flex-wrap' }, children)
		},
	},
	{
		accessorKey: 'source',
		header: 'Source',
		cell: ({ row }) => h('span', { class: 'text-sm text-dimmed font-mono' }, row.original.source),
	},
	{
		accessorKey: 'count_skills',
		header: 'Skills',
		cell: ({ row }) => h('span', { class: 'tabular-nums' }, String(row.original.count_skills)),
	},
	{
		accessorKey: 'tokens_estimated',
		header: 'Est. Tokens',
		cell: ({ row }) => h('span', {
			class: 'tabular-nums text-sm',
		}, row.original.tokens_estimated > 0 ? formatCompact(row.original.tokens_estimated) : '-'),
	},
	{
		accessorKey: 'is_enabled',
		header: 'Enabled',
		cell: ({ row }) => {
			const plugin = row.original
			return h(UButton, {
				color: plugin.is_enabled ? 'success' : 'neutral',
				variant: 'subtle',
				size: 'xs',
				loading: is_toggling.value === plugin.id_plugin,
				onClick: () => togglePlugin(plugin.id_plugin, !plugin.is_enabled),
			}, () => plugin.is_enabled ? 'On' : 'Off')
		},
	},
]

const tokens_rules = computed(() => {
	if (!data.value?.list_rules) return 0
	return data.value.list_rules.reduce((sum, r) => sum + r.tokens_estimated, 0)
})

const color_severity: Record<ContextSuggestion['severity'], string> = {
	high: 'error',
	medium: 'warning',
	low: 'info',
}
</script>

<template>
	<UDashboardPanel id="context-health">
		<template #header>
			<UDashboardNavbar title="Context Health">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #trailing>
					<UButton
						icon="i-lucide-refresh-cw"
						variant="ghost"
						size="sm"
						:loading="status === 'pending'"
						@click="refresh()"
					/>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6 space-y-6">
				<!-- Summary Cards -->
				<div v-if="status === 'pending'" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<USkeleton v-for="i in 4" :key="i" class="h-24" />
				</div>
				<div v-else-if="data" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard
						v-for="item in list_stats"
						:key="item.key"
						:label="item.label"
						:count="item.value"
						:icon="item.icon"
					/>
				</div>

				<!-- Suggestions -->
				<UCard v-if="data?.list_suggestions?.length">
					<template #header>
						<h3 class="text-sm font-medium text-dimmed">Optimization Suggestions</h3>
					</template>
					<div class="space-y-3">
						<div
							v-for="(suggestion, idx) in data.list_suggestions"
							:key="idx"
							class="flex items-start gap-3 p-3 rounded-lg bg-elevated/50"
						>
							<UBadge
								:color="color_severity[suggestion.severity] ?? 'neutral'"
								variant="subtle"
								size="sm"
								class="mt-0.5 shrink-0"
							>
								{{ suggestion.severity }}
							</UBadge>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium">{{ suggestion.title }}</p>
								<p class="text-sm text-dimmed mt-0.5">{{ suggestion.description }}</p>
							</div>
							<UButton
								v-if="suggestion.action_type === 'disable_plugin' && suggestion.action_target"
								color="error"
								variant="soft"
								size="xs"
								:loading="is_toggling === suggestion.action_target"
								@click="applySuggestion(suggestion)"
							>
								Disable
							</UButton>
						</div>
					</div>
				</UCard>

				<!-- Plugin Table -->
				<UCard>
					<template #header>
						<h3 class="text-sm font-medium text-dimmed">Plugins</h3>
					</template>

					<div v-if="status === 'pending'">
						<USkeleton v-for="i in 6" :key="i" class="h-10 mb-2" />
					</div>
					<UTable
						v-else-if="data?.list_plugins?.length"
						:data="data.list_plugins"
						:columns="columns_plugins"
					/>
					<div v-else class="text-sm text-dimmed">
						No plugins found.
					</div>
				</UCard>

				<!-- Duplicates -->
				<UCard v-if="data?.list_duplicates?.length">
					<template #header>
						<h3 class="text-sm font-medium text-dimmed">Duplicate Skills</h3>
					</template>
					<div class="space-y-2">
						<div
							v-for="dup in data.list_duplicates"
							:key="dup.name_skill"
							class="flex items-center gap-3 p-2 rounded-lg bg-elevated/50"
						>
							<UIcon name="i-lucide-copy" class="size-4 text-error shrink-0" />
							<span class="font-mono text-sm">{{ dup.name_skill }}</span>
							<div class="flex gap-1 flex-wrap">
								<UBadge
									v-for="src in dup.list_sources"
									:key="src"
									color="neutral"
									variant="subtle"
									size="xs"
								>
									{{ src }}
								</UBadge>
							</div>
						</div>
					</div>
				</UCard>

				<!-- Rules -->
				<UCard v-if="data?.list_rules?.length">
					<template #header>
						<h3 class="text-sm font-medium text-dimmed">
							Rule Files ({{ formatCompact(tokens_rules) }} est. tokens)
						</h3>
					</template>
					<div class="space-y-1">
						<div
							v-for="rule in data.list_rules"
							:key="rule.path_relative"
							class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-elevated/50"
						>
							<span class="font-mono text-sm text-dimmed">{{ rule.path_relative }}</span>
							<span class="text-xs tabular-nums text-dimmed">~{{ rule.tokens_estimated }} tokens</span>
						</div>
					</div>
				</UCard>
			</div>
		</template>
	</UDashboardPanel>
</template>
