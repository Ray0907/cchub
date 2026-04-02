<script setup lang="ts">
const props = withDefaults(defineProps<{
	content: string
	language?: string
	can_edit?: boolean
}>(), {
	can_edit: false
})

const emit = defineEmits<{
	save: [content: string]
}>()

const { copy, copied } = useClipboard()

const is_editing = ref(false)
const content_draft = ref('')

const lines = computed(() => props.content.split('\n'))

function startEditing() {
	content_draft.value = props.content
	is_editing.value = true
}

function handleSave() {
	emit('save', content_draft.value)
	is_editing.value = false
}

function handleCancel() {
	is_editing.value = false
}
</script>

<template>
	<div class="relative overflow-auto">
		<template v-if="is_editing">
			<textarea
				v-model="content_draft"
				class="w-full p-4 text-sm font-mono bg-transparent border border-(--ui-border) rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-(--ui-primary)"
				style="min-height: 300px"
			/>
			<div class="flex gap-2 mt-2">
				<UButton
					icon="i-lucide-save"
					label="Save"
					color="primary"
					variant="soft"
					size="xs"
					@click="handleSave"
				/>
				<UButton
					icon="i-lucide-x"
					label="Cancel"
					color="neutral"
					variant="ghost"
					size="xs"
					@click="handleCancel"
				/>
			</div>
		</template>

		<template v-else>
			<div class="absolute top-2 right-2 z-10 flex gap-1">
				<UButton
					v-if="can_edit"
					icon="i-lucide-pencil"
					color="neutral"
					variant="ghost"
					size="xs"
					@click="startEditing"
				/>
				<UButton
					:icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
					color="neutral"
					variant="ghost"
					size="xs"
					@click="copy(content)"
				/>
			</div>

			<div class="p-4 font-mono text-sm">
				<table class="border-collapse">
					<tbody>
						<tr v-for="(line, idx) in lines" :key="idx">
							<td class="pr-4 text-right text-dimmed select-none align-top w-1">
								{{ idx + 1 }}
							</td>
							<td class="whitespace-pre-wrap break-words">{{ line }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
	</div>
</template>
