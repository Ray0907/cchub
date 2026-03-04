import type { SpriteData } from './types'

/**
 * Cache that maps sprite data + zoom level to pre-rendered HTMLCanvasElement.
 * Avoids re-rendering the same sprite every frame.
 */
const cache = new Map<string, HTMLCanvasElement>()

/** Generate a unique cache key for a sprite + zoom pair. */
function cacheKey(sprite: SpriteData, zoom: number): string {
	// Use object identity via a WeakMap-backed ID for speed
	let id = spriteIdMap.get(sprite)
	if (id === undefined) {
		id = nextSpriteId++
		spriteIdMap.set(sprite, id)
	}
	return `${id}@${zoom}`
}

const spriteIdMap = new WeakMap<SpriteData, number>()
let nextSpriteId = 0

/**
 * Get a cached canvas for the given sprite at the given zoom level.
 * Renders the sprite to a new canvas on first access, then returns the cached version.
 */
export function getCachedSprite(sprite: SpriteData, zoom: number): HTMLCanvasElement {
	const key = cacheKey(sprite, zoom)
	const existing = cache.get(key)
	if (existing) return existing

	const rows = sprite.length
	const cols = sprite[0]?.length ?? 0
	const canvas = document.createElement('canvas')
	canvas.width = cols * zoom
	canvas.height = rows * zoom

	const ctx = canvas.getContext('2d')
	if (!ctx) return canvas

	// Disable image smoothing for crisp pixel art
	ctx.imageSmoothingEnabled = false

	for (let r = 0; r < rows; r++) {
		const row = sprite[r]
		if (!row) continue
		for (let c = 0; c < cols; c++) {
			const color = row[c]
			if (!color) continue
			ctx.fillStyle = color
			ctx.fillRect(c * zoom, r * zoom, zoom, zoom)
		}
	}

	cache.set(key, canvas)
	return canvas
}

/** Clear the entire sprite cache. Call when zoom changes or on cleanup. */
export function clearSpriteCache(): void {
	cache.clear()
}
