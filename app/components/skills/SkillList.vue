<script setup lang="ts">
const props = defineProps<{
	items: {
		name_skill: string
		description: string
		tools_allowed: string[]
		hooks: string[]
		version: string
		name_dir: string
	}[]
}>()

const query_search = ref('')

const list_filtered = computed(() => {
	const q = query_search.value.toLowerCase()
	if (!q) return props.items
	return props.items.filter(s =>
		s.name_skill.toLowerCase().includes(q)
		|| s.description.toLowerCase().includes(q)
	)
})
</script>

<template>
	<div class="space-y-4">
		<UInput
			v-model="query_search"
			icon="i-lucide-search"
			placeholder="Search skills..."
			class="max-w-sm"
		/>

		<div v-if="list_filtered.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<UCard
				v-for="skill in list_filtered"
				:key="skill.name_dir"
				class="hover:ring-primary/50 hover:ring-1 transition-all cursor-pointer"
				@click="navigateTo(`/skills/${skill.name_dir}`)"
			>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-sm">{{ skill.name_skill }}</h3>
						<UBadge v-if="skill.version" color="neutral" variant="subtle" size="xs">
							v{{ skill.version }}
						</UBadge>
					</div>
					<p v-if="skill.description" class="text-sm text-dimmed line-clamp-2">
						{{ skill.description }}
					</p>
					<div v-if="skill.tools_allowed.length" class="flex flex-wrap gap-1">
						<UBadge
							v-for="tool in skill.tools_allowed.slice(0, 3)"
							:key="tool"
							color="primary"
							variant="subtle"
							size="xs"
						>
							{{ tool }}
						</UBadge>
						<UBadge
							v-if="skill.tools_allowed.length > 3"
							color="neutral"
							variant="subtle"
							size="xs"
						>
							+{{ skill.tools_allowed.length - 3 }}
						</UBadge>
					</div>
				</div>
			</UCard>
		</div>
		<div v-else class="text-sm text-dimmed">
			No skills found.
		</div>
	</div>
</template>
