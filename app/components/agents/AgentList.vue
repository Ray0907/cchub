<script setup lang="ts">
const props = defineProps<{
	items: {
		name_agent: string
		description: string
		tools: string[]
		model: string
		name_file: string
	}[]
}>()

const query_search = ref('')

const list_filtered = computed(() => {
	const q = query_search.value.toLowerCase()
	if (!q) return props.items
	return props.items.filter(a =>
		a.name_agent.toLowerCase().includes(q)
		|| a.description.toLowerCase().includes(q)
		|| a.model.toLowerCase().includes(q)
	)
})
</script>

<template>
	<div class="space-y-4">
		<UInput
			v-model="query_search"
			icon="i-lucide-search"
			placeholder="Search agents..."
			class="max-w-sm"
		/>

		<div v-if="list_filtered.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<UCard
				v-for="agent in list_filtered"
				:key="agent.name_file"
				class="hover:ring-primary/50 hover:ring-1 transition-all cursor-pointer"
				@click="navigateTo(`/agents/${agent.name_file}`)"
			>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-sm">{{ agent.name_agent }}</h3>
						<UBadge v-if="agent.model" color="primary" variant="subtle" size="xs">
							{{ agent.model }}
						</UBadge>
					</div>
					<p v-if="agent.description" class="text-sm text-dimmed line-clamp-2">
						{{ agent.description }}
					</p>
					<div v-if="agent.tools.length" class="flex flex-wrap gap-1">
						<UBadge
							v-for="tool in agent.tools.slice(0, 4)"
							:key="tool"
							color="neutral"
							variant="subtle"
							size="xs"
						>
							{{ tool }}
						</UBadge>
						<UBadge
							v-if="agent.tools.length > 4"
							color="neutral"
							variant="subtle"
							size="xs"
						>
							+{{ agent.tools.length - 4 }}
						</UBadge>
					</div>
				</div>
			</UCard>
		</div>
		<div v-else class="text-sm text-dimmed">
			No agents found.
		</div>
	</div>
</template>
