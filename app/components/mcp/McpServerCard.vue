<script setup lang="ts">
defineProps<{
	name_server: string
	server: {
		command?: string
		args?: string[]
		env?: Record<string, string>
		type?: string
		url?: string
	}
}>()
</script>

<template>
	<UCard>
		<template #header>
			<div class="flex items-center gap-2">
				<UIcon name="i-lucide-plug" class="size-4 text-primary" />
				<h3 class="font-semibold text-sm">{{ name_server }}</h3>
				<UBadge v-if="server.type" color="neutral" variant="subtle" size="xs">
					{{ server.type }}
				</UBadge>
			</div>
		</template>

		<div class="space-y-3 text-sm">
			<div v-if="server.command">
				<p class="text-xs font-medium text-dimmed mb-1">Command</p>
				<code class="text-xs bg-elevated px-2 py-1 rounded font-mono">{{ server.command }}</code>
			</div>

			<div v-if="server.url">
				<p class="text-xs font-medium text-dimmed mb-1">URL</p>
				<code class="text-xs bg-elevated px-2 py-1 rounded font-mono break-all">{{ server.url }}</code>
			</div>

			<div v-if="server.args?.length">
				<p class="text-xs font-medium text-dimmed mb-1">Arguments</p>
				<div class="flex flex-wrap gap-1">
					<UBadge
						v-for="(arg, idx) in server.args"
						:key="idx"
						color="neutral"
						variant="subtle"
						size="xs"
					>
						{{ arg }}
					</UBadge>
				</div>
			</div>

			<div v-if="server.env && Object.keys(server.env).length">
				<p class="text-xs font-medium text-dimmed mb-1">Environment</p>
				<div class="space-y-1">
					<div
						v-for="(val, key) in server.env"
						:key="key"
						class="flex items-center gap-2 text-xs font-mono"
					>
						<span class="text-dimmed">{{ key }}:</span>
						<span class="truncate">{{ val }}</span>
					</div>
				</div>
			</div>
		</div>
	</UCard>
</template>
