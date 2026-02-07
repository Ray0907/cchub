import type { H3Event } from 'h3'
import { createError } from 'h3'

export function defineApiHandler<T>(
	handler: (event: H3Event) => Promise<T>
) {
	return defineEventHandler(async (event) => {
		try {
			return await handler(event)
		}
		catch (error: unknown) {
			if (error && typeof error === 'object' && 'statusCode' in error) {
				throw error
			}
			const message = error instanceof Error ? error.message : 'Internal server error'
			throw createError({
				statusCode: 500,
				statusMessage: message
			})
		}
	})
}
