export default defineEventHandler((event) => {
	const path = getRequestURL(event).pathname

	// Set auth cookie on page loads (non-API routes)
	if (!path.startsWith('/api/')) {
		setCookie(event, '__cc_auth', getAuthToken(), {
			httpOnly: true,
			sameSite: 'strict',
			secure: false,
			path: '/'
		})
		return
	}

	// Check httpOnly cookie (set automatically by browser)
	const cookie = getCookie(event, '__cc_auth')
	if (cookie === getAuthToken()) return

	// Check Authorization header (for programmatic access: curl, scripts)
	const authHeader = getHeader(event, 'authorization')
	if (authHeader === `Bearer ${getAuthToken()}`) return

	// Allow SSR internal calls: Nitro's internal handler uses node-mock-http
	// which creates mock sockets with the __unenv__ marker property.
	// Real HTTP sockets never have this property.
	const socket = event.node.req.socket as Record<string, unknown>
	if (socket && '__unenv__' in socket) return

	throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
})
