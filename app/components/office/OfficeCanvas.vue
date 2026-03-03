<script setup lang="ts">
import {
	TILE_SIZE,
	CharacterState,
	type OfficeCharacter
} from '~/utils/office/types'
import { startGameLoop, updateCharacter } from '~/utils/office/engine'
import { renderFrame, hitTestCharacter } from '~/utils/office/renderer'
import { loadAllCharacters, hasCharacterSprites } from '~/utils/office/characters'
import { buildFurniture, OFFICE_COLS, OFFICE_ROWS } from '~/utils/office/layout'
import { clearSpriteCache } from '~/utils/office/spriteCache'

const props = defineProps<{
	characters: OfficeCharacter[]
	selectedId: string | null
}>()

const emit = defineEmits<{
	select: [id: string]
	hover: [id: string | null]
}>()

const el_canvas = ref<HTMLCanvasElement | null>(null)
const el_container = ref<HTMLElement | null>(null)
const is_loaded = ref(false)
const has_sprites = ref(false)

const furniture = buildFurniture()

let zoom = 1
let offsetX = 0
let offsetY = 0
let hoveredId: string | null = null
let stopLoop: (() => void) | null = null
let observer: ResizeObserver | null = null

function calculateZoom(): void {
	const container = el_container.value
	if (!container) return

	const containerW = container.clientWidth
	const containerH = container.clientHeight
	const worldW = OFFICE_COLS * TILE_SIZE
	const worldH = OFFICE_ROWS * TILE_SIZE

	// Fit the world into the container
	const scaleX = containerW / worldW
	const scaleY = containerH / worldH
	zoom = Math.floor(Math.min(scaleX, scaleY))
	if (zoom < 1) zoom = 1

	// Center the world in the container
	offsetX = Math.floor((containerW - worldW * zoom) / 2)
	offsetY = Math.floor((containerH - worldH * zoom) / 2)

	clearSpriteCache()
}

function resizeCanvas(): void {
	const canvas = el_canvas.value
	const container = el_container.value
	if (!canvas || !container) return

	const dpr = window.devicePixelRatio || 1
	const w = container.clientWidth
	const h = container.clientHeight

	canvas.width = w * dpr
	canvas.height = h * dpr
	canvas.style.width = `${w}px`
	canvas.style.height = `${h}px`

	calculateZoom()
}

function handleMouseMove(event: MouseEvent): void {
	const canvas = el_canvas.value
	if (!canvas) return

	const rect = canvas.getBoundingClientRect()
	const cx = event.clientX - rect.left
	const cy = event.clientY - rect.top

	const hit = hitTestCharacter(cx, cy, zoom, offsetX, offsetY, props.characters)
	if (hit !== hoveredId) {
		hoveredId = hit
		emit('hover', hit)
		canvas.style.cursor = hit ? 'pointer' : 'default'
	}
}

function handleClick(event: MouseEvent): void {
	const canvas = el_canvas.value
	if (!canvas) return

	const rect = canvas.getBoundingClientRect()
	const cx = event.clientX - rect.left
	const cy = event.clientY - rect.top

	const hit = hitTestCharacter(cx, cy, zoom, offsetX, offsetY, props.characters)
	if (hit) {
		emit('select', hit)
	}
}

function handleMouseLeave(): void {
	if (hoveredId !== null) {
		hoveredId = null
		emit('hover', null)
		if (el_canvas.value) {
			el_canvas.value.style.cursor = 'default'
		}
	}
}

onMounted(async () => {
	await loadAllCharacters()
	has_sprites.value = hasCharacterSprites()
	is_loaded.value = true

	const canvas = el_canvas.value
	if (!canvas) return

	resizeCanvas()

	const dpr = window.devicePixelRatio || 1

	stopLoop = startGameLoop(canvas, {
		update(dt: number) {
			for (const ch of props.characters) {
				updateCharacter(ch, dt)
			}
		},
		render(ctx: CanvasRenderingContext2D) {
			const container = el_container.value
			if (!container) return

			const w = container.clientWidth
			const h = container.clientHeight

			ctx.save()
			ctx.scale(dpr, dpr)
			renderFrame(ctx, w, h, zoom, offsetX, offsetY, furniture, props.characters, props.selectedId, hoveredId)
			ctx.restore()
		}
	})

	observer = new ResizeObserver(() => {
		resizeCanvas()
	})
	if (el_container.value) {
		observer.observe(el_container.value)
	}
})

onUnmounted(() => {
	if (stopLoop) {
		stopLoop()
		stopLoop = null
	}
	if (observer) {
		observer.disconnect()
		observer = null
	}
	clearSpriteCache()
})
</script>

<template>
	<div ref="el_container" class="relative w-full h-full" style="background: #1a1a2e;">
		<canvas
			ref="el_canvas"
			class="w-full h-full"
			@mousemove="handleMouseMove"
			@click="handleClick"
			@mouseleave="handleMouseLeave"
		/>

		<!-- Loading overlay -->
		<div
			v-if="!is_loaded"
			class="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/80"
		>
			<div class="flex items-center gap-2 text-sm text-dimmed">
				<UIcon name="i-lucide-loader" class="size-4 animate-spin" />
				<span>Loading office...</span>
			</div>
		</div>

		<!-- Missing sprites warning -->
		<div
			v-if="is_loaded && !has_sprites"
			class="absolute top-2 right-2"
		>
			<UBadge color="warning" variant="subtle" size="xs">
				<UIcon name="i-lucide-alert-triangle" class="size-3" />
				No sprites loaded
			</UBadge>
		</div>
	</div>
</template>
