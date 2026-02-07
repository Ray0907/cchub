import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
	const router = useRouter()
	const is_ai_sidebar_open = ref(false)

	defineShortcuts({
		'g-c': () => router.push('/ai'),
		'g-o': () => router.push('/'),
		'g-k': () => router.push('/skills'),
		'g-a': () => router.push('/agents'),
		'g-r': () => router.push('/rules'),
		'g-s': () => router.push('/settings'),
		'g-m': () => router.push('/claude-md'),
		'g-h': () => router.push('/history'),
		'g-e': () => router.push('/sessions'),
		'a-i': () => is_ai_sidebar_open.value = !is_ai_sidebar_open.value
	})

	return {
		is_ai_sidebar_open
	}
}

export const useDashboard = createSharedComposable(_useDashboard)
