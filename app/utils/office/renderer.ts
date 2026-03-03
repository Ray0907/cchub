import type { FurnitureInstance, OfficeCharacter, SpriteData } from './types'
import {
	CHARACTER_SITTING_OFFSET,
	CharacterState,
	TILE_SIZE,
} from './types'
import { getCharacterSpriteSet } from './characters'
import { OFFICE_COLS, OFFICE_ROWS, TILE_MAP, getTileSprite } from './layout'
import { getCachedSprite } from './spriteCache'

export interface RenderState {
	canvas: HTMLCanvasElement
	ctx: CanvasRenderingContext2D
	zoom: number
	furniture: FurnitureInstance[]
	characters: OfficeCharacter[]
	selectedCharId: string | null
	hoveredCharId: string | null
}

interface Renderable {
	sprite: SpriteData
	x: number
	y: number
	zY: number
	isCharacter?: boolean
	charId?: string
}

/**
 * Render a complete frame of the office scene.
 */
export function renderFrame(state: RenderState): void {
	const { canvas, ctx, zoom, furniture, characters, selectedCharId, hoveredCharId } = state

	// ─── Clear ───────────────────────────────────────────────────
	ctx.fillStyle = '#1a1a2e'
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	// ─── Draw tile grid ──────────────────────────────────────────
	for (let r = 0; r < OFFICE_ROWS; r++) {
		for (let c = 0; c < OFFICE_COLS; c++) {
			const tileType = TILE_MAP[r][c]
			const tileSprite = getTileSprite(tileType)
			const cached = getCachedSprite(tileSprite, zoom)
			ctx.drawImage(cached, c * TILE_SIZE * zoom, r * TILE_SIZE * zoom)
		}
	}

	// ─── Build renderable list (furniture + characters) ──────────
	const renderables: Renderable[] = []

	for (const f of furniture) {
		renderables.push({
			sprite: f.sprite,
			x: f.x,
			y: f.y,
			zY: f.zY,
		})
	}

	for (const char of characters) {
		if (!char.isActive) continue

		const spriteSet = getCharacterSpriteSet(char.palette)
		if (!spriteSet) continue

		let sprite: SpriteData
		if (char.state === CharacterState.TYPE) {
			const frames = spriteSet.typing[char.dir]
			sprite = frames[char.frame % frames.length]
		}
		else {
			const frames = spriteSet.walk[char.dir]
			sprite = frames[0] // idle = first walk frame
		}

		// Characters sit slightly offset upward when at their seat
		const yOffset = -CHARACTER_SITTING_OFFSET

		renderables.push({
			sprite,
			x: char.x,
			y: char.y + yOffset,
			zY: char.y + TILE_SIZE, // sort by feet position
			isCharacter: true,
			charId: char.id,
		})
	}

	// ─── Z-sort by depth (ascending zY = further back drawn first) ─
	renderables.sort((a, b) => a.zY - b.zY)

	// ─── Draw renderables ────────────────────────────────────────
	for (const r of renderables) {
		const cached = getCachedSprite(r.sprite, zoom)
		const dx = r.x * zoom
		const dy = r.y * zoom

		// Selection highlight (drawn behind the character sprite)
		if (r.isCharacter && r.charId === selectedCharId) {
			ctx.save()
			ctx.globalAlpha = 0.3
			ctx.fillStyle = '#FFD700'
			ctx.beginPath()
			ctx.ellipse(
				dx + (TILE_SIZE * zoom) / 2,
				dy + cached.height - 2 * zoom,
				(TILE_SIZE * zoom) / 2 + 2 * zoom,
				4 * zoom,
				0,
				0,
				Math.PI * 2,
			)
			ctx.fill()
			ctx.restore()
		}

		// Hover highlight
		if (r.isCharacter && r.charId === hoveredCharId && r.charId !== selectedCharId) {
			ctx.save()
			ctx.globalAlpha = 0.2
			ctx.fillStyle = '#FFFFFF'
			ctx.beginPath()
			ctx.ellipse(
				dx + (TILE_SIZE * zoom) / 2,
				dy + cached.height - 2 * zoom,
				(TILE_SIZE * zoom) / 2 + 1 * zoom,
				3 * zoom,
				0,
				0,
				Math.PI * 2,
			)
			ctx.fill()
			ctx.restore()
		}

		ctx.drawImage(cached, dx, dy)
	}

	// ─── Name labels ─────────────────────────────────────────────
	for (const char of characters) {
		if (!char.isActive) continue
		if (char.id !== selectedCharId && char.id !== hoveredCharId) continue

		const spriteSet = getCharacterSpriteSet(char.palette)
		if (!spriteSet) continue

		const labelX = char.x * zoom + (TILE_SIZE * zoom) / 2
		const labelY = (char.y - CHARACTER_SITTING_OFFSET) * zoom - 4 * zoom

		const fontSize = Math.max(9, Math.round(10 * zoom))
		ctx.font = `bold ${fontSize}px "SF Mono", "Fira Code", monospace`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'bottom'

		// Background pill
		const metrics = ctx.measureText(char.name)
		const padX = 4 * zoom
		const padY = 2 * zoom
		const pillW = metrics.width + padX * 2
		const pillH = fontSize + padY * 2

		ctx.save()
		ctx.globalAlpha = 0.75
		ctx.fillStyle = '#000000'
		ctx.beginPath()
		const pillR = 3 * zoom
		const px = labelX - pillW / 2
		const py = labelY - pillH
		ctx.roundRect(px, py, pillW, pillH, pillR)
		ctx.fill()
		ctx.restore()

		// Text
		ctx.fillStyle = char.id === selectedCharId ? '#FFD700' : '#FFFFFF'
		ctx.fillText(char.name, labelX, labelY - padY)
	}
}

/**
 * Hit-test: given mouse coordinates on the canvas, return the character ID
 * at that position, or null if no character is there.
 *
 * Checks characters in reverse z-order (topmost first).
 */
export function hitTestCharacter(
	mouseX: number,
	mouseY: number,
	state: RenderState,
): string | null {
	const { zoom, characters } = state

	// Check in reverse order (front-to-back) so topmost character wins
	const sorted = [...characters]
		.filter(c => c.isActive && getCharacterSpriteSet(c.palette))
		.sort((a, b) => (b.y + TILE_SIZE) - (a.y + TILE_SIZE))

	for (const char of sorted) {
		const spriteSet = getCharacterSpriteSet(char.palette)
		if (!spriteSet) continue

		const yOffset = -CHARACTER_SITTING_OFFSET
		const spriteH = 32 // character sprites are 32px tall
		const charScreenX = char.x * zoom
		const charScreenY = (char.y + yOffset) * zoom
		const charScreenW = TILE_SIZE * zoom
		const charScreenH = spriteH * zoom

		if (
			mouseX >= charScreenX
			&& mouseX < charScreenX + charScreenW
			&& mouseY >= charScreenY
			&& mouseY < charScreenY + charScreenH
		) {
			return char.id
		}
	}

	return null
}
