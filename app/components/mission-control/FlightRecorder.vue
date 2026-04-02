<script setup lang="ts">
import type { McEvent } from '~/composables/useMissionControl'

const MAX_EVENT_BUFFER = 10_000

const props = defineProps<{
	events: McEvent[]
}>()

const emit = defineEmits<{
	'replay-at': [index: number]
}>()

const buffer_events = ref<McEvent[]>([])
const current_index = ref(0)
const is_playing = ref(false)
const speed = ref(1)
let id_playback: ReturnType<typeof setInterval> | null = null

const has_events = computed(() => buffer_events.value.length > 0)
const is_replaying = computed(() => current_index.value < buffer_events.value.length)

watch(() => props.events, (events, previous) => {
	const length_previous = previous?.length ?? 0
	const was_live = current_index.value >= length_previous
	buffer_events.value = events.slice(-MAX_EVENT_BUFFER)

	if (!has_events.value) {
		current_index.value = 0
		stopPlayback()
		return
	}

	if (was_live) {
		current_index.value = buffer_events.value.length
	}
}, { immediate: true })

watch(speed, () => {
	if (is_playing.value) {
		startPlayback()
	}
})

onBeforeUnmount(stopPlayback)

function startPlayback(): void {
	if (!has_events.value) return
	stopPlayback()
	is_playing.value = true
	id_playback = setInterval(stepForward, Math.max(125, Math.floor(1000 / speed.value)))
}

function stopPlayback(): void {
	if (id_playback) clearInterval(id_playback)
	id_playback = null
	is_playing.value = false
}

function togglePlayback(): void {
	if (is_playing.value) {
		stopPlayback()
		return
	}

	if (!has_events.value) return

	if (!is_replaying.value) {
		current_index.value = 0
		emitIndex()
	}

	startPlayback()
}

function stepForward(): void {
	if (!has_events.value) {
		stopPlayback()
		return
	}

	if (current_index.value >= buffer_events.value.length) {
		current_index.value = 0
		emitIndex()
		return
	}

	if (current_index.value + 1 >= buffer_events.value.length) {
		current_index.value = buffer_events.value.length
		emitIndex()
		stopPlayback()
		return
	}

	current_index.value += 1
	emitIndex()
}

function emitIndex(): void {
	emit('replay-at', current_index.value)
}

function onSliderInput(event: Event): void {
	const target = event.target as HTMLInputElement | null
	current_index.value = Number(target?.value || 0)
	emitIndex()
	if (current_index.value >= buffer_events.value.length) {
		stopPlayback()
	}
}

function backToLive(): void {
	current_index.value = buffer_events.value.length
	emitIndex()
	stopPlayback()
}
</script>

<template>
	<UCard>
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-3">
					<h2 class="text-sm font-medium text-dimmed">
						Flight Recorder
					</h2>
					<UBadge
						v-if="is_replaying"
						color="primary"
						variant="soft"
						size="sm"
						class="text-amber-600 dark:text-amber-300"
					>
						REPLAYING
					</UBadge>
				</div>
				<p class="mt-1 text-xs text-dimmed/80">
					{{ has_events ? `${current_index} / ${buffer_events.length} events` : 'Waiting for telemetry' }}
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<UButton
					size="sm"
					color="neutral"
					variant="outline"
					:disabled="!has_events"
					@click="togglePlayback"
				>
					<UIcon :name="is_playing ? 'i-lucide-pause' : 'i-lucide-play'" class="size-4" />
					<span>{{ is_playing ? 'Pause' : 'Play' }}</span>
				</UButton>

				<select
					v-model.number="speed"
					class="h-8 rounded-md border border-default bg-default px-2 pr-7 text-sm text-dimmed outline-none"
				>
					<option :value="1">
						1x
					</option>
					<option :value="2">
						2x
					</option>
					<option :value="4">
						4x
					</option>
				</select>

				<UButton
					size="sm"
					color="primary"
					variant="soft"
					:disabled="!is_replaying"
					@click="backToLive"
				>
					Back to Live
				</UButton>
			</div>
		</div>

		<div class="mt-4">
			<input
				:value="current_index"
				type="range"
				class="h-2 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-primary disabled:cursor-not-allowed disabled:opacity-50"
				:min="0"
				:max="buffer_events.length"
				:disabled="!has_events"
				@input="onSliderInput"
			>
		</div>
	</UCard>
</template>
