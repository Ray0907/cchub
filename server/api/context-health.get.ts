import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

interface PluginHealthItem {
	id_plugin: string
	name_plugin: string
	source: string
	is_enabled: boolean
	count_skills: number
	tokens_estimated: number
}

interface DuplicateGroup {
	name_skill: string
	list_sources: string[]
}

interface RuleHealthItem {
	name_rule: string
	path_relative: string
	size_bytes: number
	tokens_estimated: number
}

interface ContextSuggestion {
	severity: 'high' | 'medium' | 'low'
	title: string
	description: string
	action_type: 'disable_plugin' | 'info'
	action_target?: string
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cache: { data: unknown; time_created: number } | null = null

export default defineApiHandler(async () => {
	if (cache && Date.now() - cache.time_created < CACHE_TTL_MS) {
		return cache.data
	}

	const path_settings = resolveClaudePath('settings.json')
	const path_manifest = resolveClaudePath('plugins', 'installed_plugins.json')
	const path_rules = resolveClaudePath('rules')

	// Read settings to get enabled/disabled plugins
	let list_enabled: string[] = []
	let list_disabled: string[] = []
	try {
		const raw = await readFile(path_settings, 'utf-8')
		const settings = JSON.parse(raw)
		list_enabled = Array.isArray(settings.enabledPlugins) ? settings.enabledPlugins : []
		list_disabled = Array.isArray(settings.disabledPlugins) ? settings.disabledPlugins : []
	}
	catch {
		// settings missing
	}

	// Read installed_plugins.json for install paths
	let map_plugins: Record<string, { installPath: string }[]> = {}
	try {
		const raw = await readFile(path_manifest, 'utf-8')
		const manifest = JSON.parse(raw)
		map_plugins = manifest.plugins ?? {}
	}
	catch {
		// manifest missing
	}

	// Scan each plugin for skills
	const list_plugins: PluginHealthItem[] = []
	const map_skill_sources = new Map<string, string[]>()
	let tokens_plugins = 0

	for (const [id_plugin, entries] of Object.entries(map_plugins)) {
		const entry = entries[0]
		if (!entry) continue

		const idx_at = id_plugin.indexOf('@')
		const name_plugin = idx_at >= 0 ? id_plugin.slice(0, idx_at) : id_plugin
		const source = idx_at >= 0 ? id_plugin.slice(idx_at + 1) : 'unknown'
		const is_enabled = list_enabled.includes(id_plugin) && !list_disabled.includes(id_plugin)

		const { count_skills, bytes_skills } = await scanPluginSkills(
			join(entry.installPath, 'skills'),
			id_plugin,
			is_enabled,
			map_skill_sources,
		)

		const tokens_estimated = Math.ceil(bytes_skills / 4)
		if (is_enabled) tokens_plugins += tokens_estimated

		list_plugins.push({
			id_plugin,
			name_plugin,
			source,
			is_enabled,
			count_skills,
			tokens_estimated,
		})
	}

	// Sort: enabled first, then by skill count descending
	list_plugins.sort((a, b) => {
		if (a.is_enabled !== b.is_enabled) return a.is_enabled ? -1 : 1
		return b.count_skills - a.count_skills
	})

	// Find duplicates (skills appearing in multiple enabled plugins)
	const list_duplicates: DuplicateGroup[] = []
	for (const [name_skill, sources] of map_skill_sources) {
		if (sources.length > 1) {
			list_duplicates.push({ name_skill, list_sources: sources })
		}
	}

	// Scan rules directory
	let list_rules: RuleHealthItem[] = []
	try {
		list_rules = await scanRulesDir(path_rules, path_rules)
	}
	catch {
		// rules dir missing
	}

	// Count totals
	const count_plugins_enabled = list_plugins.filter(p => p.is_enabled).length
	const count_skills_total = list_plugins
		.filter(p => p.is_enabled)
		.reduce((sum, p) => sum + p.count_skills, 0)
	const tokens_rules = list_rules.reduce((sum, r) => sum + r.tokens_estimated, 0)
	const tokens_estimated = tokens_plugins + tokens_rules

	const list_suggestions = generateSuggestions(
		list_plugins,
		list_duplicates,
		count_skills_total,
		count_plugins_enabled,
	)

	const data = {
		count_plugins_enabled,
		count_skills_total,
		count_rules: list_rules.length,
		tokens_estimated,
		list_plugins,
		list_duplicates,
		list_rules,
		list_suggestions,
	}

	cache = { data, time_created: Date.now() }

	return data
})

// Scan a plugin's skills directory, tracking sources for duplicate detection
async function scanPluginSkills(
	path_skills: string,
	id_plugin: string,
	is_enabled: boolean,
	map_skill_sources: Map<string, string[]>,
): Promise<{ count_skills: number; bytes_skills: number }> {
	let count_skills = 0
	let bytes_skills = 0

	let dirents
	try {
		dirents = await readdir(path_skills, { withFileTypes: true })
	}
	catch {
		return { count_skills, bytes_skills }
	}

	for (const dirent of dirents) {
		if (dirent.name.startsWith('.')) continue

		const path_skill = join(path_skills, dirent.name)

		if (dirent.isDirectory()) {
			count_skills++
			bytes_skills += await sumMarkdownBytes(path_skill)
			if (is_enabled) trackSkillSource(map_skill_sources, dirent.name, id_plugin)
		}
		else if (dirent.isFile() && dirent.name.endsWith('.md')) {
			count_skills++
			const file_stat = await stat(path_skill).catch(() => null)
			if (file_stat) bytes_skills += file_stat.size
			if (is_enabled) {
				const name_skill = dirent.name.replace(/\.md$/, '')
				trackSkillSource(map_skill_sources, name_skill, id_plugin)
			}
		}
	}

	return { count_skills, bytes_skills }
}

// Sum byte sizes of all .md files in a directory
async function sumMarkdownBytes(path_dir: string): Promise<number> {
	let total = 0
	try {
		const list_files = await readdir(path_dir)
		for (const file of list_files) {
			if (!file.endsWith('.md')) continue
			const file_stat = await stat(join(path_dir, file)).catch(() => null)
			if (file_stat) total += file_stat.size
		}
	}
	catch {
		// skip unreadable dirs
	}
	return total
}

function trackSkillSource(
	map: Map<string, string[]>,
	name_skill: string,
	id_plugin: string,
): void {
	const existing = map.get(name_skill) ?? []
	existing.push(id_plugin)
	map.set(name_skill, existing)
}

async function scanRulesDir(
	path_base: string,
	path_current: string,
): Promise<RuleHealthItem[]> {
	const entries = await readdir(path_current, { withFileTypes: true })
	const list_rules: RuleHealthItem[] = []

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue
		const path_full = join(path_current, entry.name)

		if (entry.isDirectory()) {
			const children = await scanRulesDir(path_base, path_full)
			list_rules.push(...children)
		}
		else if (entry.isFile() && entry.name.endsWith('.md')) {
			const file_stat = await stat(path_full).catch(() => null)
			if (!file_stat) continue

			list_rules.push({
				name_rule: entry.name.replace(/\.md$/, ''),
				path_relative: relative(path_base, path_full),
				size_bytes: file_stat.size,
				tokens_estimated: Math.ceil(file_stat.size / 4),
			})
		}
	}

	return list_rules
}

function generateSuggestions(
	list_plugins: PluginHealthItem[],
	list_duplicates: DuplicateGroup[],
	count_skills: number,
	count_enabled: number,
): ContextSuggestion[] {
	const list_suggestions: ContextSuggestion[] = []

	if (list_duplicates.length > 0) {
		const names = list_duplicates.map(d => d.name_skill).slice(0, 5).join(', ')
		list_suggestions.push({
			severity: 'high',
			title: `${list_duplicates.length} duplicate skills detected`,
			description: `Skills like ${names} appear in multiple enabled plugins. Disable one source to reduce context size.`,
			action_type: 'info',
		})
	}

	// Check for duplicate superpowers specifically
	const list_superpowers = list_plugins.filter(
		p => p.name_plugin === 'superpowers' && p.is_enabled,
	)
	if (list_superpowers.length > 1) {
		const first = list_superpowers[0]!
		const source_to_disable =
			list_superpowers.find(p => p.source !== 'superpowers-marketplace')
			?? list_superpowers[1]!
		list_suggestions.push({
			severity: 'high',
			title: 'Duplicate superpowers plugin',
			description: `superpowers is installed from both ${list_superpowers.map(p => p.source).join(' and ')}. Disable one to remove ${first.count_skills} duplicate skills.`,
			action_type: 'disable_plugin',
			action_target: source_to_disable.id_plugin,
		})
	}

	const list_zero_skill = list_plugins.filter(p => p.is_enabled && p.count_skills === 0)
	if (list_zero_skill.length > 0) {
		list_suggestions.push({
			severity: 'medium',
			title: `${list_zero_skill.length} plugins with 0 skills`,
			description: `Plugins without skills still add overhead. Consider disabling: ${list_zero_skill.map(p => p.name_plugin).slice(0, 5).join(', ')}`,
			action_type: 'info',
		})
	}

	const list_lsp = list_plugins.filter(p => p.is_enabled && p.name_plugin.endsWith('-lsp'))
	if (list_lsp.length > 3) {
		list_suggestions.push({
			severity: 'medium',
			title: `${list_lsp.length} LSP plugins enabled`,
			description: `Each LSP plugin adds context overhead. Disable LSP plugins for languages you don't actively use: ${list_lsp.map(p => p.name_plugin).join(', ')}`,
			action_type: 'info',
		})
	}

	if (count_enabled > 20) {
		list_suggestions.push({
			severity: 'low',
			title: `${count_enabled} plugins enabled`,
			description: 'Having many plugins increases system prompt size. Consider keeping only plugins relevant to your current workflow.',
			action_type: 'info',
		})
	}

	if (count_skills > 80) {
		list_suggestions.push({
			severity: 'low',
			title: `${count_skills} total skills in context`,
			description: 'Each skill is listed in the system prompt. Reducing plugin count will lower skill count.',
			action_type: 'info',
		})
	}

	return list_suggestions
}
