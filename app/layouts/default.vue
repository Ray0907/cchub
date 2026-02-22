<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)

const links_main: NavigationMenuItem[] = [{
	label: 'Claude Code',
	icon: 'i-lucide-terminal-square',
	to: '/ai',
	onSelect: () => { open.value = false }
}, {
	label: 'Overview',
	icon: 'i-lucide-layout-dashboard',
	to: '/',
	onSelect: () => { open.value = false }
}, {
	label: 'Skills',
	icon: 'i-lucide-zap',
	to: '/skills',
	onSelect: () => { open.value = false }
}, {
	label: 'Agents',
	icon: 'i-lucide-bot',
	to: '/agents',
	onSelect: () => { open.value = false }
}, {
	label: 'Rules',
	icon: 'i-lucide-scale',
	to: '/rules',
	onSelect: () => { open.value = false }
}, {
	label: 'Settings',
	icon: 'i-lucide-settings',
	to: '/settings',
	onSelect: () => { open.value = false }
}, {
	label: 'CLAUDE.md',
	icon: 'i-lucide-file-text',
	to: '/claude-md',
	onSelect: () => { open.value = false }
}, {
	label: 'Sessions',
	icon: 'i-lucide-clock',
	to: '/ai/sessions',
	onSelect: () => { open.value = false }
}, {
	label: 'Hooks',
	icon: 'i-lucide-webhook',
	to: '/hooks',
	onSelect: () => { open.value = false }
}, {
	label: 'MCP',
	icon: 'i-lucide-plug',
	to: '/mcp',
	onSelect: () => { open.value = false }
}, {
	label: 'Commands',
	icon: 'i-lucide-terminal',
	to: '/commands',
	onSelect: () => { open.value = false }
}, {
	label: 'Plugins',
	icon: 'i-lucide-puzzle',
	to: '/plugins',
	onSelect: () => { open.value = false }
}, {
	label: 'Context Health',
	icon: 'i-lucide-heart-pulse',
	to: '/context-health',
	onSelect: () => { open.value = false }
}, {
	label: 'Plans',
	icon: 'i-lucide-map',
	to: '/plans',
	onSelect: () => { open.value = false }
}, {
	label: 'History',
	icon: 'i-lucide-history',
	to: '/history',
	onSelect: () => { open.value = false }
}, {
	label: 'Teams',
	icon: 'i-lucide-users',
	to: '/teams',
	onSelect: () => { open.value = false }
}]

const groups_search = computed(() => [{
	id: 'navigation',
	label: 'Navigation',
	items: links_main.map(item => ({
		label: item.label,
		icon: item.icon,
		to: item.to
	}))
}])
</script>

<template>
	<UDashboardGroup unit="rem">
		<UDashboardSidebar
			id="default"
			v-model:open="open"
			collapsible
			resizable
			class="bg-elevated/25"
			:ui="{ footer: 'lg:border-t lg:border-default' }"
		>
			<template #header="{ collapsed }">
				<div class="flex items-center gap-2 px-1" :class="collapsed ? 'justify-center' : ''">
					<UIcon name="i-lucide-terminal" class="size-5 text-primary" />
					<span v-if="!collapsed" class="font-semibold text-sm">CC Hub</span>
				</div>
			</template>

			<template #default="{ collapsed }">
				<UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

				<UNavigationMenu
					:collapsed="collapsed"
					:items="links_main"
					orientation="vertical"
					tooltip
					popover
				/>
			</template>

			<template #footer="{ collapsed }">
				<UserMenu :collapsed="collapsed" />
			</template>
		</UDashboardSidebar>

		<UDashboardSearch :groups="groups_search" />

		<slot />
	</UDashboardGroup>
</template>
