import type { OfficeCharacter } from './types'
import {
	CharacterState,
	MAX_DELTA_TIME,
	TYPE_FRAME_DURATION,
} from './types'
import { getCharacterSpriteSet } from './characters'

/**
 * Update a single character's animation state each frame.
 */
export function updateCharacter(char: OfficeCharacter, dt: number): void {
	if (!char.isActive) return

	const spriteSet = getCharacterSpriteSet(char.palette)
	if (!spriteSet) return

	if (char.state === CharacterState.TYPE) {
		// Animate typing frames
		char.frameTimer += dt
		const typingFrames = spriteSet.typing[char.dir]
		if (char.frameTimer >= TYPE_FRAME_DURATION) {
			char.frameTimer -= TYPE_FRAME_DURATION
			char.frame = (char.frame + 1) % typingFrames.length
		}
	}
	else {
		// Idle: hold frame 0
		char.frame = 0
		char.frameTimer = 0
	}
}

export interface GameLoopOptions {
	characters: OfficeCharacter[]
	onFrame: () => void
}

/**
 * Start the game loop. Returns a cleanup function to stop the loop.
 *
 * Each tick:
 *   1. Compute delta time (clamped to MAX_DELTA_TIME)
 *   2. Update all characters
 *   3. Call onFrame() for rendering
 */
export function startGameLoop(options: GameLoopOptions): () => void {
	const { characters, onFrame } = options
	let lastTime = 0
	let animFrameId = 0
	let running = true

	function tick(timestamp: number): void {
		if (!running) return

		const dt = lastTime === 0 ? 0 : Math.min((timestamp - lastTime) / 1000, MAX_DELTA_TIME)
		lastTime = timestamp

		for (const char of characters) {
			updateCharacter(char, dt)
		}

		onFrame()

		animFrameId = requestAnimationFrame(tick)
	}

	animFrameId = requestAnimationFrame(tick)

	return () => {
		running = false
		cancelAnimationFrame(animFrameId)
	}
}
