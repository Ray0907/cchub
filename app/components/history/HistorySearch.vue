<script setup lang="ts">
const model_query = defineModel<string>('query', { default: '' })
</script>

<template>
	<UInput
		v-model="model_query"
		icon="i-lucide-search"
		placeholder="Search history..."
		class="max-w-sm"
	/>
</template>
