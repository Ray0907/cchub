import { unlink } from 'node:fs/promises'

export default defineApiHandler(async (event) => {
	const name = getRouterParam(event, 'name')
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Missing agent name' })
	}

	const path_file = resolveClaudePath('agents', `${name}.md`)
	const path_backup = await createBackup(path_file)
	await unlink(path_file)

	return { success: true, path_backup }
})
