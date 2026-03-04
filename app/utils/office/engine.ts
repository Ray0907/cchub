import type { OfficeCharacter } from './types'
import {
	CharacterState,
	Direction,
	MAX_DELTA_TIME,
	TILE_SIZE,
	TYPE_FRAME_DURATION,
	WALK_FRAME_DURATION,
	WALK_SPEED,
} from './types'
import { getCharacterSpriteSet } from './characters'
import { bfsPath, buildWalkableList } from './pathfinding'

export interface GameLoopCallbacks {
	update: (dt: number) => void
	render: (ctx: CanvasRenderingContext2D) => void
}

// ─── Helpers ─────────────────────────────────────────────────────

function randomWanderDelay(): number {
	return 2 + Math.random() * 18
}

function randomWanderLimit(): number {
	return 1 + Math.floor(Math.random() * 4)
}

function directionToward(
	from_col: number,
	from_row: number,
	to: { col: number; row: number },
): Direction {
	const dc = to.col - from_col
	const dr = to.row - from_row
	if (Math.abs(dc) >= Math.abs(dr)) {
		return dc > 0 ? Direction.RIGHT : Direction.LEFT
	}
	return dr > 0 ? Direction.DOWN : Direction.UP
}

function pickWanderDest(ch: OfficeCharacter): { col: number; row: number } | null {
	const walkable = buildWalkableList()
	if (walkable.length === 0) return null

	// Try up to 10 times to find a different tile
	for (let i = 0; i < 10; i++) {
		const tile = walkable[Math.floor(Math.random() * walkable.length)]!
		if (tile.col !== ch.tileCol || tile.row !== ch.tileRow) {
			return tile
		}
	}
	return null
}

function startWalkTo(ch: OfficeCharacter, to_col: number, to_row: number): void {
	const path = bfsPath(ch.tileCol, ch.tileRow, to_col, to_row)
	if (path.length === 0) return

	ch.path = path
	ch.moveProgress = 0
	ch.state = CharacterState.WALK
	ch.frame = 0
	ch.frameTimer = 0
	ch.dir = directionToward(ch.tileCol, ch.tileRow, path[0]!)
}

function isAtSeat(ch: OfficeCharacter): boolean {
	return ch.tileCol === ch.seat.col && ch.tileRow === ch.seat.row
}

// ─── State machine ───────────────────────────────────────────────

function updateIdle(ch: OfficeCharacter, dt: number): void {
	// If activated (streaming started), walk to seat
	if (ch.isActive) {
		if (isAtSeat(ch)) {
			ch.state = CharacterState.TYPE
			ch.dir = ch.seat.facingDir
			ch.frame = 0
			ch.frameTimer = 0
		} else {
			startWalkTo(ch, ch.seat.col, ch.seat.row)
		}
		return
	}

	// Wander countdown
	ch.wanderTimer -= dt
	if (ch.wanderTimer <= 0) {
		if (ch.wander_count >= ch.wander_limit) {
			// Time to go back to seat
			if (!isAtSeat(ch)) {
				startWalkTo(ch, ch.seat.col, ch.seat.row)
				ch.wander_count = 0
				ch.wander_limit = randomWanderLimit()
			} else {
				// Already at seat, reset and wait
				ch.wanderTimer = randomWanderDelay()
				ch.wander_count = 0
				ch.wander_limit = randomWanderLimit()
			}
		} else {
			const dest = pickWanderDest(ch)
			if (dest) {
				startWalkTo(ch, dest.col, dest.row)
				ch.wander_count++
			} else {
				ch.wanderTimer = randomWanderDelay()
			}
		}
	}

	// Hold idle frame
	ch.frame = 0
	ch.frameTimer = 0
}

function updateWalk(ch: OfficeCharacter, dt: number): void {
	if (ch.path.length === 0) {
		// Arrived: no more path
		if (isAtSeat(ch) && ch.isActive) {
			ch.state = CharacterState.TYPE
			ch.dir = ch.seat.facingDir
			ch.frame = 0
			ch.frameTimer = 0
		} else {
			ch.state = CharacterState.IDLE
			ch.wanderTimer = randomWanderDelay()
		}
		return
	}

	// If activated mid-walk, re-path to seat
	if (ch.isActive) {
		const lastTile = ch.path[ch.path.length - 1]!
		if (lastTile.col !== ch.seat.col || lastTile.row !== ch.seat.row) {
			startWalkTo(ch, ch.seat.col, ch.seat.row)
			if (ch.path.length === 0) return
		}
	}

	// Advance movement
	ch.moveProgress += (WALK_SPEED / TILE_SIZE) * dt
	if (ch.moveProgress >= 1) {
		// Arrived at next tile
		const next = ch.path.shift()!
		ch.tileCol = next.col
		ch.tileRow = next.row
		ch.x = next.col * TILE_SIZE
		ch.y = next.row * TILE_SIZE
		ch.moveProgress = 0

		// Update direction for next segment
		if (ch.path.length > 0) {
			ch.dir = directionToward(ch.tileCol, ch.tileRow, ch.path[0]!)
		}

		// Check if walk is complete
		if (ch.path.length === 0) {
			if (isAtSeat(ch) && ch.isActive) {
				ch.state = CharacterState.TYPE
				ch.dir = ch.seat.facingDir
				ch.frame = 0
				ch.frameTimer = 0
			} else {
				ch.state = CharacterState.IDLE
				ch.wanderTimer = randomWanderDelay()
			}
			return
		}
	}

	// Animate walk cycle
	ch.frameTimer += dt
	if (ch.frameTimer >= WALK_FRAME_DURATION) {
		ch.frameTimer -= WALK_FRAME_DURATION
		ch.frame = (ch.frame + 1) % 4
	}
}

function updateType(ch: OfficeCharacter, dt: number): void {
	// If streaming stopped, go idle
	if (!ch.isActive) {
		ch.state = CharacterState.IDLE
		ch.wanderTimer = randomWanderDelay()
		ch.wander_count = 0
		ch.wander_limit = randomWanderLimit()
		ch.frame = 0
		ch.frameTimer = 0
		return
	}

	// Animate typing
	const spriteSet = getCharacterSpriteSet(ch.palette)
	if (!spriteSet) return

	ch.frameTimer += dt
	const typingFrames = spriteSet.typing[ch.dir]
	if (ch.frameTimer >= TYPE_FRAME_DURATION) {
		ch.frameTimer -= TYPE_FRAME_DURATION
		ch.frame = (ch.frame + 1) % typingFrames.length
	}
}

/**
 * Update a single character's state each frame.
 */
export function updateCharacter(ch: OfficeCharacter, dt: number): void {
	switch (ch.state) {
		case CharacterState.IDLE:
			updateIdle(ch, dt)
			break
		case CharacterState.WALK:
			updateWalk(ch, dt)
			break
		case CharacterState.TYPE:
			updateType(ch, dt)
			break
	}
}

/**
 * Start the game loop. Returns a cleanup function to stop the loop.
 */
export function startGameLoop(
	canvas: HTMLCanvasElement,
	callbacks: GameLoopCallbacks,
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
