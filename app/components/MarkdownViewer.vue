<script setup lang="ts">
const props = withDefaults(defineProps<{
	content_raw: string
	can_edit?: boolean
}>(), {
	can_edit: false
})

const emit = defineEmits<{
	save: [content: string]
}>()

const is_editing = ref(false)
const content_draft = ref('')

const content_model = computed({
	get: () => is_editing.value ? content_draft.value : props.content_raw,
	set: (val: string) => { content_draft.value = val }
})

function startEditing(): void {
	content_draft.value = props.content_raw
	is_editing.value = true
}

function handleSave(): void {
	emit('save', content_draft.value)
	is_editing.value = false
}

function handleCancel(): void {
	content_draft.value = props.content_raw
	is_editing.value = false
}
</script>

<template>
	<div class="relative">
		<!-- Action buttons -->
		<div v-if="can_edit && !is_editing" class="absolute top-2 right-2 z-10">
			<UButton
				icon="i-lucide-pencil"
				color="neutral"
				variant="ghost"
				size="xs"
				@click="startEditing"
			/>
		</div>

		<!-- Editor -->
		<UEditor
			v-model="content_model"
			content-type="markdown"
			:editable="is_editing"
			class="min-h-[200px]"
		/>

		<!-- Save / Cancel bar -->
		<div v-if="is_editing" class="flex gap-2 mt-2 px-2 pb-2">
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
	</div>
</template>
