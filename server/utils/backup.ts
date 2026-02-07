import { copyFile } from 'node:fs/promises'

export async function createBackup(path_file: string): Promise<string> {
	const path_backup = `${path_file}.bak`
	await copyFile(path_file, path_backup)
	return path_backup
}
