import type { FurnitureInstance, Seat, SpriteData } from './types'
import { Direction, TILE_SIZE } from './types'
import {
	BOOKSHELF_SPRITE,
	CHAIR_SPRITE,
	DESK_SPRITE,
	FLOOR_SPRITE,
	MONITOR_SPRITE,
	PLANT_SPRITE,
	WALL_SPRITE
} from './sprites'

// ─── Office dimensions (tiles) ───────────────────────────────────
export const OFFICE_COLS = 18
export const OFFICE_ROWS = 12

// ─── Tile types ──────────────────────────────────────────────────
const WALL = 1
const FLOOR = 0

/**
 * 2D tile map: 0 = floor, 1 = wall.
 * Walls along all edges, floor inside.
 */
export const TILE_MAP: number[][] = (() => {
	const map: number[][] = []
	for (let r = 0; r < OFFICE_ROWS; r++) {
		const row: number[] = []
		for (let c = 0; c < OFFICE_COLS; c++) {
			if (r === 0 || r === OFFICE_ROWS - 1 || c === 0 || c === OFFICE_COLS - 1) {
				row.push(WALL)
			} else {
				row.push(FLOOR)
			}
		}
		map.push(row)
	}
	return map
})()

/**
 * 6 agent seats arranged as 2 rows of 3.
 * Each seat has a tile position and the direction the agent faces (toward the desk).
 *
 * Layout (tile coordinates):
 *   Row 1 (top):  cols 3, 8, 13 at row 4  — facing UP (toward desks at row 3)
 *   Row 2 (bot):  cols 3, 8, 13 at row 8  — facing UP (toward desks at row 7)
 */
export const AGENT_SEATS: Seat[] = [
	// Top row
	{ col: 4, row: 4, facingDir: Direction.UP },
	{ col: 8, row: 4, facingDir: Direction.UP },
	{ col: 13, row: 4, facingDir: Direction.UP },
	// Bottom row
	{ col: 4, row: 8, facingDir: Direction.UP },
	{ col: 8, row: 8, facingDir: Direction.UP },
	{ col: 13, row: 8, facingDir: Direction.UP }
]

/** Return the sprite for a tile type. */
export function getTileSprite(tileType: number): SpriteData {
	return tileType === WALL ? WALL_SPRITE : FLOOR_SPRITE
}

/**
 * Build all furniture instances for the office.
 * Returns an array of FurnitureInstance objects positioned in pixel coordinates.
 */
export function buildFurniture(): FurnitureInstance[] {
	const furniture: FurnitureInstance[] = []

	// Helper: place furniture at tile position
	function place(sprite: SpriteData, tileCol: number, tileRow: number, zYOffset = 0): void {
		const x = tileCol * TILE_SIZE
		const y = tileRow * TILE_SIZE
		furniture.push({
			sprite,
			x,
			y,
			zY: y + (sprite.length * 1) + zYOffset // depth sort by bottom edge
		})
	}

	// ─── Desks (32px wide = 2 tiles) ─────────────────────────────
	// Top row desks (at row 3, centered on seat cols)
	place(DESK_SPRITE, 3, 2)
	place(DESK_SPRITE, 7, 2)
	place(DESK_SPRITE, 12, 2)

	// Bottom row desks (at row 7, centered on seat cols)
	place(DESK_SPRITE, 3, 6)
	place(DESK_SPRITE, 7, 6)
	place(DESK_SPRITE, 12, 6)

	// ─── Monitors (on desks) ─────────────────────────────────────
	// Top row monitors
	place(MONITOR_SPRITE, 4, 2, -2)
	place(MONITOR_SPRITE, 8, 2, -2)
	place(MONITOR_SPRITE, 13, 2, -2)

	// Bottom row monitors
	place(MONITOR_SPRITE, 4, 6, -2)
	place(MONITOR_SPRITE, 8, 6, -2)
	place(MONITOR_SPRITE, 13, 6, -2)

	// ─── Chairs (at seat positions) ──────────────────────────────
	for (const seat of AGENT_SEATS) {
		place(CHAIR_SPRITE, seat.col, seat.row, 4)
	}

	// ─── Plants (corners and between desks) ──────────────────────
	place(PLANT_SPRITE, 1, 1)
	place(PLANT_SPRITE, 16, 1)
	place(PLANT_SPRITE, 1, 9)
	place(PLANT_SPRITE, 16, 9)
	place(PLANT_SPRITE, 6, 5)
	place(PLANT_SPRITE, 11, 5)

	// ─── Bookshelves (against walls) ─────────────────────────────
	place(BOOKSHELF_SPRITE, 1, 4, -8)
	place(BOOKSHELF_SPRITE, 16, 4, -8)

	return furniture
}
