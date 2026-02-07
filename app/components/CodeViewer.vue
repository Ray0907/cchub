<script setup lang="ts">
const props = defineProps<{
	content: string
	language?: string
}>()

const { copy, copied } = useClipboard()

const lines = computed(() => props.content.split('\n'))
</script>

<template>
	<div class="relative overflow-auto">
		<div class="absolute top-2 right-2 z-10">
			<UButton
				:icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
				color="neutral"
				variant="ghost"
				size="xs"
				@click="copy(content)"
			/>
		</div>

		<div class="p-4 font-mono text-sm">
			<table class="border-collapse">
				<tbody>
					<tr v-for="(line, idx) in lines" :key="idx">
						<td class="pr-4 text-right text-dimmed select-none align-top w-1">
							{{ idx + 1 }}
						</td>
						<td class="whitespace-pre-wrap break-words">{{ line }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
