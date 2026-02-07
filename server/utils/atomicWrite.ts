import { rename, unlink, writeFile } from 'node:fs/promises'

export async function writeFileAtomic(
	path_file: string,
	content: string
): Promise<void> {
	const path_tmp = path_file + '.tmp'
	try {
		await writeFile(path_tmp, content, 'utf-8')
		await rename(path_tmp, path_file)
	}
	catch (err) {
		await unlink(path_tmp).catch(() => {})
		throw err
	}
}
