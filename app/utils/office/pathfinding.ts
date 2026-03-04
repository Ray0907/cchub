import { OFFICE_COLS, OFFICE_ROWS, TILE_MAP } from './layout'

// ─── Blocked furniture footprints (tile coordinates) ─────────────
// Desks are 2 tiles wide (32px sprite on 16px grid)
const DESK_TILES: [number, number][] = [
	// Top row desks
	[3, 2], [4, 2], [3, 3], [4, 3],
	[7, 2], [8, 2], [7, 3], [8, 3],
	[12, 2], [13, 2], [12, 3], [13, 3],
	// Bottom row desks
	[3, 6], [4, 6], [3, 7], [4, 7],
	[7, 6], [8, 6], [7, 7], [8, 7],
	[12, 6], [13, 6], [12, 7], [13, 7],
]

const PLANT_TILES: [number, number][] = [
	[1, 1], [16, 1], [1, 9], [16, 9], [6, 5], [11, 5],
]

// Bookshelves are 1 tile wide, 2 tiles tall
const BOOKSHELF_TILES: [number, number][] = [
	[1, 4], [1, 5], [16, 4], [16, 5],
]

const blockedSet = new Set<string>()

function initBlocked(): void {
	if (blockedSet.size > 0) return

	// Walls from TILE_MAP
	for (let r = 0; r < OFFICE_ROWS; r++) {
		for (let c = 0; c < OFFICE_COLS; c++) {
			if (TILE_MAP[r]?.[c] === 1) {
				blockedSet.add(`${c},${r}`)
			}
		}
	}

	// Furniture
	for (const [c, r] of DESK_TILES) {
		blockedSet.add(`${c},${r}`)
	}
	for (const [c, r] of PLANT_TILES) {
		blockedSet.add(`${c},${r}`)
	}
	for (const [c, r] of BOOKSHELF_TILES) {
		blockedSet.add(`${c},${r}`)
	}
}

export function isWalkable(col: number, row: number): boolean {
	initBlocked()
	if (col < 0 || col >= OFFICE_COLS || row < 0 || row >= OFFICE_ROWS) return false
	return !blockedSet.has(`${col},${row}`)
}

let walkableListCache: { col: number; row: number }[] | null = null

export function buildWalkableList(): { col: number; row: number }[] {
	if (walkableListCache) return walkableListCache

	initBlocked()
	const list: { col: number; row: number }[] = []
	for (let r = 0; r < OFFICE_ROWS; r++) {
		for (let c = 0; c < OFFICE_COLS; c++) {
			if (!blockedSet.has(`${c},${r}`)) {
				list.push({ col: c, row: r })
			}
		}
	}
	walkableListCache = list
	return list
}

const DIRS: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

/**
 * BFS pathfinding on 4-connected grid.
 * Returns path excluding start, including end. Empty array if unreachable.
 */
export function bfsPath(
	from_col: number,
	from_row: number,
	to_col: number,
	to_row: number,
): { col: number; row: number }[] {
	initBlocked()

	if (from_col === to_col && from_row === to_row) return []
	if (!isWalkable(to_col, to_row)) return []

	const visited = new Set<string>()
	const parent = new Map<string, string>()
	const queue: [number, number][] = [[from_col, from_row]]
	const startKey = `${from_col},${from_row}`
	visited.add(startKey)

	while (queue.length > 0) {
		const [cx, cy] = queue.shift()!
		const currentKey = `${cx},${cy}`

		if (cx === to_col && cy === to_row) {
			// Reconstruct path
			const path: { col: number; row: number }[] = []
			let key = currentKey
			while (key !== startKey) {
				const [pc, pr] = key.split(',').map(Number) as [number, number]
				path.unshift({ col: pc, row: pr })
				key = parent.get(key)!
			}
			return path
		}

		for (const [dx, dy] of DIRS) {
			const nx = cx + dx
			const ny = cy + dy
			const nKey = `${nx},${ny}`
			if (!visited.has(nKey) && isWalkable(nx, ny)) {
				visited.add(nKey)
				parent.set(nKey, currentKey)
				queue.push([nx, ny])
			}
		}
	}

	return []
}
