<script setup lang="ts">
import { VisXYContainer, VisArea, VisAxis, VisCrosshair, VisLine } from '@unovis/vue'
import { CurveType } from '@unovis/ts'

interface DailyData {
	date: string
	tokens_input: number
	tokens_output: number
	tokens_cache_read: number
}

const props = defineProps<{
	data: DailyData[]
}>()

const list_data = computed(() =>
	props.data.map((d, i) => ({
		...d,
		index: i,
		tokens_total: d.tokens_input + d.tokens_output + d.tokens_cache_read,
	}))
)

type DataPoint = typeof list_data.value[number]

const x = (_d: DataPoint, i: number) => i
const y = (d: DataPoint) => d.tokens_total

const color_primary = 'var(--ui-primary)'

const tickFormatX = (i: number) => {
	const d = list_data.value[Math.round(i)]
	if (!d) return ''
	return d.date.slice(5)
}

const tickFormatY = (v: number) => {
	if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
	if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
	if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
	return String(v)
}

const template = (d: DataPoint) => {
	return `
		<div class="text-xs space-y-1 p-1">
			<div class="font-medium">${d.date}</div>
			<div class="text-dimmed">Input: ${tickFormatY(d.tokens_input)}</div>
			<div class="text-dimmed">Output: ${tickFormatY(d.tokens_output)}</div>
			<div class="text-dimmed">Cache Read: ${tickFormatY(d.tokens_cache_read)}</div>
			<div class="font-medium">Total: ${tickFormatY(d.tokens_total)}</div>
		</div>
	`
}
</script>

<template>
	<div v-if="list_data.length" class="h-[300px] w-full">
		<VisXYContainer
			:data="list_data"
			:padding="{ top: 10, right: 10, bottom: 0, left: 0 }"
			height="300px"
		>
			<VisArea
				:x="x"
				:y="y"
				:color="color_primary"
				:opacity="0.15"
				:curve-type="CurveType.MonotoneX"
			/>
			<VisLine
				:x="x"
				:y="y"
				:color="color_primary"
				:curve-type="CurveType.MonotoneX"
			/>
			<VisAxis
				type="x"
				:tick-format="tickFormatX"
				:num-ticks="7"
				:grid-line="false"
				tick-text-color="var(--ui-text-dimmed)"
				tick-text-font-size="11px"
			/>
			<VisAxis
				type="y"
				:tick-format="tickFormatY"
				:num-ticks="5"
				:grid-line="true"
				:domain-line="false"
				:tick-line="false"
				tick-text-color="var(--ui-text-dimmed)"
				tick-text-font-size="11px"
			/>
			<VisCrosshair
				:template="template"
				color="var(--ui-text-dimmed)"
			/>
		</VisXYContainer>
	</div>
	<div v-else class="h-[300px] w-full flex items-center justify-center text-sm text-dimmed">
		No usage data for the last 30 days
	</div>
</template>
