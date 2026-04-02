<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

type PluginRow = {
	name_plugin: string
	is_enabled: boolean
}

defineProps<{
	items: PluginRow[]
}>()

const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')

const columns: TableColumn<PluginRow>[] = [
	{
		accessorKey: 'name_plugin',
		header: 'Plugin',
		cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
			h(UIcon, { name: 'i-lucide-puzzle', class: 'size-4 text-dimmed' }),
			h('span', { class: 'font-mono text-sm' }, row.original.name_plugin)
		])
	},
	{
		accessorKey: 'is_enabled',
		header: 'Status',
		cell: ({ row }) => h(UBadge, {
			color: row.original.is_enabled ? 'success' : 'neutral',
			variant: 'subtle',
			size: 'sm'
		}, () => row.original.is_enabled ? 'Enabled' : 'Disabled')
	},
]
</script>

<template>
	<div v-if="items.length">
		<UTable :data="items" :columns="columns" />
	</div>
	<div v-else class="text-sm text-dimmed">
		No plugins found.
	</div>
</template>
