const map_locks = new Map<string, Promise<void>>()

export async function withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
	const prev = map_locks.get(key) ?? Promise.resolve()
	let resolve_current!: () => void
	const current = new Promise<void>(r => { resolve_current = r })
	map_locks.set(key, current)
	try {
		await prev
		return await fn()
	}
	finally {
		resolve_current()
		if (map_locks.get(key) === current) map_locks.delete(key)
	}
}
