export default defineNitroPlugin(() => {
	const token = getAuthToken()
	console.log('')
	console.log('\x1b[36m%s\x1b[0m', '🔑 API Auth Token (for programmatic access):')
	console.log('\x1b[33m%s\x1b[0m', `   Authorization: Bearer ${token}`)
	console.log('')
})
