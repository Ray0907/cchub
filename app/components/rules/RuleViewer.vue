<script setup lang="ts">
defineProps<{
	rule: {
		name_file: string
		path_relative: string
		content_raw: string
	}
}>()
</script>

<template>
	<div class="space-y-3">
		<div class="flex items-center gap-2">
			<h2 class="text-lg font-semibold">{{ rule.name_file }}</h2>
			<UBadge color="neutral" variant="subtle" size="xs">
				{{ rule.path_relative }}
			</UBadge>
		</div>
		<UCard>
			<MarkdownViewer
				:content_raw="rule.content_raw"
			/>
		</UCard>
	</div>
</template>
