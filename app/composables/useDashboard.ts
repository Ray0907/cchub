import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
	const router = useRouter()

	defineShortcuts({
		'g-c': () => router.push('/ai'),
		'g-o': () => router.push('/'),
		'g-k': () => router.push('/skills'),
		'g-a': () => router.push('/agents'),
		'g-r': () => router.push('/rules'),
		'g-s': () => router.push('/settings'),
		'g-m': () => router.push('/claude-md'),
		'g-h': () => router.push('/history'),
		'g-e': () => router.push('/sessions')
	})

	return {}
}

export const useDashboard = createSharedComposable(_useDashboard)
