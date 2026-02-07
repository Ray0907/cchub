import { randomBytes } from 'node:crypto'

// Generated once per server start, lives in memory only
const _token = randomBytes(32).toString('hex')

export function getAuthToken(): string {
	return _token
}
