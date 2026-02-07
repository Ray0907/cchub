<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

defineProps<{
	entries: Record<string, unknown>[]
	count_total: number
}>()

const emit = defineEmits<{
	'load-more': []
}>()

const UBadge = resolveComponent('UBadge')

const columns: TableColumn<Record<string, unknown>>[] = [
	{
		accessorKey: 'type',
		header: 'Type',
		cell: ({ row }) => h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs' }, () => String(row.original.type || 'unknown'))
	},
	{
		accessorKey: 'message',
		header: 'Message',
		cell: ({ row }) => {
			const msg = row.original.message
			return h('span', { class: 'text-sm line-clamp-2' }, String(msg || JSON.stringify(row.original).slice(0, 120)))
		}
	},
	{
		accessorKey: 'timestamp',
		header: 'Time',
		cell: ({ row }) => {
			const ts = row.original.timestamp
			if (!ts || typeof ts !== 'string') return '-'
			return h('span', { class: 'text-xs text-dimmed' }, new Date(ts).toLocaleString('en-US'))
		}
	},
]
</script>

<template>
	<div class="space-y-3">
		<UTable :data="entries" :columns="columns" />

		<div v-if="entries.length < count_total" class="flex justify-center">
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="emit('load-more')"
			>
				Load more ({{ entries.length }} / {{ count_total }})
			</UButton>
		</div>
	</div>
</template>
