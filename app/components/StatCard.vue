<script setup lang="ts">
defineProps<{
	label: string
	count: number | string
	icon: string
}>()
</script>

<template>
	<UCard>
		<div class="flex items-center gap-3">
			<div class="flex items-center justify-center size-10 rounded-lg bg-primary/10">
				<UIcon :name="icon" class="size-5 text-primary" />
			</div>
			<div>
				<p class="text-sm text-dimmed">{{ label }}</p>
				<p class="text-2xl font-semibold">{{ count }}</p>
			</div>
		</div>
	</UCard>
</template>
