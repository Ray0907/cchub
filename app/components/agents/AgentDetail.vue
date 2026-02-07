<script setup lang="ts">
defineProps<{
	agent: {
		name_agent: string
		description: string
		tools: string[]
		model: string
		name_file: string
		content_raw: string
	}
}>()
</script>

<template>
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<UButton
				icon="i-lucide-arrow-left"
				color="neutral"
				variant="ghost"
				size="sm"
				to="/agents"
			/>
			<h2 class="text-lg font-semibold">{{ agent.name_agent }}</h2>
			<UBadge v-if="agent.model" color="primary" variant="subtle" size="sm">
				{{ agent.model }}
			</UBadge>
		</div>

		<p v-if="agent.description" class="text-sm text-dimmed">
			{{ agent.description }}
		</p>

		<div v-if="agent.tools.length" class="space-y-1">
			<p class="text-xs font-medium text-dimmed">Tools</p>
			<div class="flex flex-wrap gap-1">
				<UBadge
					v-for="tool in agent.tools"
					:key="tool"
					color="neutral"
					variant="subtle"
					size="xs"
				>
					{{ tool }}
				</UBadge>
			</div>
		</div>

		<UCard>
			<MarkdownViewer
				:content_raw="agent.content_raw"
			/>
		</UCard>
	</div>
</template>
