<script setup lang="ts">
defineProps<{
	skill: {
		name_skill: string
		description: string
		tools_allowed: string[]
		hooks: string[]
		version: string
		name_dir: string
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
				to="/skills"
			/>
			<h2 class="text-lg font-semibold">{{ skill.name_skill }}</h2>
			<UBadge v-if="skill.version" color="neutral" variant="subtle" size="sm">
				v{{ skill.version }}
			</UBadge>
		</div>

		<p v-if="skill.description" class="text-sm text-dimmed">
			{{ skill.description }}
		</p>

		<div v-if="skill.tools_allowed.length" class="space-y-1">
			<p class="text-xs font-medium text-dimmed">Allowed Tools</p>
			<div class="flex flex-wrap gap-1">
				<UBadge
					v-for="tool in skill.tools_allowed"
					:key="tool"
					color="primary"
					variant="subtle"
					size="xs"
				>
					{{ tool }}
				</UBadge>
			</div>
		</div>

		<div v-if="skill.hooks.length" class="space-y-1">
			<p class="text-xs font-medium text-dimmed">Hooks</p>
			<div class="flex flex-wrap gap-1">
				<UBadge
					v-for="hook in skill.hooks"
					:key="hook"
					color="neutral"
					variant="subtle"
					size="xs"
				>
					{{ hook }}
				</UBadge>
			</div>
		</div>

		<UCard>
			<MarkdownViewer
				:content_raw="skill.content_raw"
			/>
		</UCard>
	</div>
</template>
