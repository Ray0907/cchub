<script setup lang="ts">
const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1c1412' : '#fcf4f2')

useHead({
	meta: [
		{ charset: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
		{ key: 'theme-color', name: 'theme-color', content: color }
	],
	link: [
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
	],
	htmlAttrs: {
		lang: 'en'
	}
})

useSeoMeta({
	title: 'CC Hub',
	description: 'Dashboard for browsing, searching, and editing Claude Code configuration files.'
})
</script>

<template>
	<UApp>
		<NuxtLoadingIndicator />

		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>
