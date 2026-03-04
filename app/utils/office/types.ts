export const TILE_SIZE = 16

export const CharacterState = {
	IDLE: 'idle',
	WALK: 'walk',
	TYPE: 'type'
} as const
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState]

export const Direction = {
	DOWN: 0,
	LEFT: 1,
	RIGHT: 2,
	UP: 3
} as const
export type Direction = (typeof Direction)[keyof typeof Direction]

/** 2D array of hex color strings ('' for transparent). [row][col] */
export type SpriteData = string[][]

export interface Seat {
	col: number
	row: number
	facingDir: Direction
}

export interface OfficeCharacter {
	id: string
	name: string
	state: CharacterState
	dir: Direction
	x: number
	y: number
	tileCol: number
	tileRow: number
	palette: number
	frame: number
	frameTimer: number
	isActive: boolean
	seat: Seat
	path: { col: number; row: number }[]
	moveProgress: number
	wanderTimer: number
	wander_count: number
	wander_limit: number
}

export interface FurnitureInstance {
	sprite: SpriteData
	x: number
	y: number
	zY: number
}

export const TYPE_FRAME_DURATION = 0.3
export const WALK_SPEED = 60
export const WALK_FRAME_DURATION = 0.15
export const MAX_DELTA_TIME = 0.1
export const CHARACTER_SITTING_OFFSET = 6
