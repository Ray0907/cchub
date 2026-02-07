const MAX_TIMESTAMPS = 10000

export function validateTimestamps(list_timestamps: unknown): string[] {
	if (!Array.isArray(list_timestamps) || list_timestamps.length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'Missing list_timestamps array' })
	}
	if (list_timestamps.length > MAX_TIMESTAMPS) {
		throw createError({ statusCode: 400, statusMessage: `Too many timestamps (max ${MAX_TIMESTAMPS})` })
	}
	if (!list_timestamps.every(t => typeof t === 'string' || typeof t === 'number')) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid timestamp type' })
	}
	return list_timestamps.map(String)
}
