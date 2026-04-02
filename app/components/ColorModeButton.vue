<script setup lang="ts">
const colorMode = useColorMode()

const icon = computed(() => {
	if (colorMode.preference === 'system') return 'i-lucide-monitor'
	return colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'
})

function cycleColorMode() {
	const modes = ['light', 'dark', 'system'] as const
	const idx = modes.indexOf(colorMode.preference as typeof modes[number])
	colorMode.preference = modes[(idx + 1) % modes.length]
}
</script>

<template>
	<UButton
		:icon="icon"
		color="neutral"
		variant="ghost"
		square
		@click="cycleColorMode"
	/>
</template>
