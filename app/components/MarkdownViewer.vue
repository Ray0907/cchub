<script setup lang="ts">
defineProps<{
	content_raw: string
}>()

const is_raw = ref(false)
</script>

<template>
	<div class="relative">
		<div class="absolute top-2 right-2 z-10">
			<UButton
				:icon="is_raw ? 'lucide:eye' : 'lucide:code'"
				color="neutral"
				variant="ghost"
				size="xs"
				@click="is_raw = !is_raw"
			/>
		</div>

		<div v-if="is_raw" class="overflow-auto">
			<pre class="p-4 text-sm font-mono whitespace-pre-wrap break-words"><code>{{ content_raw }}</code></pre>
		</div>
		<MDC v-else :value="content_raw" tag="article" class="prose prose-sm dark:prose-invert max-w-none p-4" />
	</div>
</template>
