import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

interface RuleTreeNode {
	name: string
	type: 'file' | 'directory'
	path_relative: string
	children?: RuleTreeNode[]
}

interface RuleItem {
	name_file: string
	path_relative: string
	time_modified: string
}

async function buildTree(path_dir: string, path_base: string): Promise<RuleTreeNode[]> {
	let entries
	try {
		entries = await readdir(path_dir, { withFileTypes: true })
	}
	catch {
		return []
	}

	const nodes: RuleTreeNode[] = []
	for (const entry of entries) {
		const path_full = join(path_dir, entry.name)
		const path_relative = relative(path_base, path_full)

		if (entry.isDirectory()) {
			const children = await buildTree(path_full, path_base)
			nodes.push({
				name: entry.name,
				type: 'directory',
				path_relative,
				children
			})
		}
		else if (entry.name.endsWith('.md')) {
			nodes.push({
				name: entry.name,
				type: 'file',
				path_relative
			})
		}
	}

	return nodes
}

async function collectFiles(path_dir: string, path_base: string): Promise<RuleItem[]> {
	let entries
	try {
		entries = await readdir(path_dir, { withFileTypes: true })
	}
	catch {
		return []
	}

	const list: RuleItem[] = []
	for (const entry of entries) {
		const path_full = join(path_dir, entry.name)
		if (entry.isDirectory()) {
			const children = await collectFiles(path_full, path_base)
			list.push(...children)
		}
		else if (entry.name.endsWith('.md')) {
			const info = await stat(path_full).catch(() => null)
			list.push({
				name_file: entry.name,
				path_relative: relative(path_base, path_full),
				time_modified: info?.mtime.toISOString() || ''
			})
		}
	}

	return list
}

export default defineApiHandler(async () => {
	const path_dir = resolveClaudePath('rules')

	const [tree, list_files] = await Promise.all([
		buildTree(path_dir, path_dir),
		collectFiles(path_dir, path_dir)
	])

	return { tree, list_files }
})
