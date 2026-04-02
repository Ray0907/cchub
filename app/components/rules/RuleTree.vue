<script setup lang="ts">
interface TreeNode {
	name: string
	type: 'file' | 'directory'
	path_relative: string
	children?: TreeNode[]
}

defineProps<{
	nodes: TreeNode[]
	depth?: number
}>()
</script>

<template>
	<ul :class="depth ? 'ml-4' : ''">
		<li v-for="node in nodes" :key="node.path_relative" class="py-0.5">
			<template v-if="node.type === 'directory'">
				<div class="flex items-center gap-1.5 text-sm text-dimmed font-medium py-1">
					<UIcon name="i-lucide-folder" class="size-4 shrink-0" />
					<span>{{ node.name }}</span>
				</div>
				<RuleTree
					v-if="node.children?.length"
					:nodes="node.children"
					:depth="(depth || 0) + 1"
				/>
			</template>
			<template v-else>
				<NuxtLink
					:to="`/rules/${node.path_relative}`"
					class="flex items-center gap-1.5 text-sm py-1 px-1 rounded hover:bg-elevated transition-colors"
					active-class="bg-primary/10 text-primary"
				>
					<UIcon name="i-lucide-file-text" class="size-4 shrink-0" />
					<span class="truncate">{{ node.name }}</span>
				</NuxtLink>
			</template>
		</li>
	</ul>
</template>
