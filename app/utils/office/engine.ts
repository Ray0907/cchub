import type { OfficeCharacter } from './types'
import {
	CharacterState,
	MAX_DELTA_TIME,
	TYPE_FRAME_DURATION
} from './types'
import { getCharacterSpriteSet } from './characters'

export interface GameLoopCallbacks {
	update: (dt: number) => void
	render: (ctx: CanvasRenderingContext2D) => void
}

/**
 * Update a single character's animation state each frame.
 */
export function updateCharacter(ch: OfficeCharacter, dt: number): void {
	if (!ch.isActive) return

	const spriteSet = getCharacterSpriteSet(ch.palette)
	if (!spriteSet) return

	if (ch.state === CharacterState.TYPE) {
		// Animate typing frames
		ch.frameTimer += dt
		const typingFrames = spriteSet.typing[ch.dir]
		if (ch.frameTimer >= TYPE_FRAME_DURATION) {
			ch.frameTimer -= TYPE_FRAME_DURATION
			ch.frame = (ch.frame + 1) % typingFrames.length
		}
	} else {
		// Idle: hold frame 0
		ch.frame = 0
		ch.frameTimer = 0
	}
}

/**
 * Start the game loop. Returns a cleanup function to stop the loop.
 *
 * Each tick:
 *   1. Compute delta time (clamped to MAX_DELTA_TIME)
 *   2. Call callbacks.update(dt)
 *   3. Call callbacks.render(ctx)
 */
export function startGameLoop(
	canvas: HTMLCanvasElement,
	callbacks: GameLoopCallbacks
): () => void {
	const ctx = canvas.getContext('2d')
	if (!ctx) {
		console.warn('[office] Failed to get canvas 2d context')
		return () => {}
	}

	let lastTime = 0
	let animFrameId = 0
	let running = true

	function tick(timestamp: number): void {
		if (!running) return

		const dt = lastTime === 0 ? 0 : Math.min((timestamp - lastTime) / 1000, MAX_DELTA_TIME)
		lastTime = timestamp

		callbacks.update(dt)
		callbacks.render(ctx!)

		animFrameId = requestAnimationFrame(tick)
	}

	animFrameId = requestAnimationFrame(tick)

	return () => {
		running = false
		cancelAnimationFrame(animFrameId)
	}
}
