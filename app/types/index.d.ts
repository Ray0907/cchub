export interface OverviewStats {
	count_skills: number
	count_agents: number
	count_rules: number
	count_hooks: number
	count_commands: number
	count_plugins: number
	count_sessions: number
	count_plans: number
	count_teams: number
	list_recent: RecentFile[]
}

export interface RecentFile {
	name_file: string
	path_relative: string
	time_modified: string
	type_file: string
}

export interface AgentItem {
	name_agent: string
	description: string
	tools: string[]
	model: string
	path_file: string
	content_raw?: string
}

export interface SkillItem {
	name_skill: string
	description: string
	tools_allowed: string[]
	hooks: string[]
	version: string
	path_file: string
	content_raw?: string
}

export interface RuleItem {
	name_rule: string
	path_relative: string
	path_file: string
	content_raw?: string
}

export interface RuleTree {
	name: string
	path: string
	children?: RuleTree[]
	is_file: boolean
}

export interface SettingsData {
	settings_global: Record<string, unknown>
	settings_local: Record<string, unknown>
}

export interface SessionItem {
	name_session: string
	path_file: string
	time_modified: string
	content_raw?: string
}

export interface HookItem {
	name_hook: string
	path_file: string
	content_raw?: string
	is_executable: boolean
}

export interface McpConfig {
	servers: Record<string, McpServer>
}

export interface McpServer {
	command: string
	args?: string[]
	env?: Record<string, string>
	type?: string
	url?: string
}

export interface CommandItem {
	name_command: string
	path_file: string
	content_raw?: string
}

export interface PluginItem {
	id_plugin: string
	name_plugin: string
	is_enabled: boolean
	path_dir?: string
}

export interface PlanItem {
	name_plan: string
	path_file: string
	time_modified: string
	content_raw?: string
}

export interface HistoryEntry {
	type: string
	message?: string
	timestamp?: string
	[key: string]: unknown
}

export interface HistorySearchResult {
	list_entries: HistoryEntry[]
	count_total: number
}

export interface TeamItem {
	name_team: string
	path_dir: string
	config: Record<string, unknown>
}

export interface ChatMessage {
	id_message: string
	role: 'user' | 'assistant'
	content: string
	time_created: string
}

export interface AgentSession {
	id_session: string | null
	list_messages: ChatMessage[]
	is_streaming: boolean
}

export interface UsageData {
	count_sessions: number
	count_messages: number
	tokens: {
		input: number
		output: number
		cache_create: number
		cache_read: number
	}
	list_daily: {
		date: string
		tokens_input: number
		tokens_output: number
		tokens_cache_read: number
	}[]
}