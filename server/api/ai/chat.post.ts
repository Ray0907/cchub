import { query } from '@anthropic-ai/claude-agent-sdk'
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { stat } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const config = useRuntimeConfig()

	const { prompt, id_session, context, cwd } = body as {
		prompt: string
		id_session?: string
		context?: string
		cwd?: string
	}

	if (!prompt?.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'prompt is required' })
	}

	// Resolve working directory - default to ~/.claude/ if not provided
	let working_dir = getClaudeHome()
	if (cwd?.trim()) {
		const raw = cwd.trim()
		const resolved = resolve(raw.replace(/^~/, homedir()))
		try {
			const info = await stat(resolved)
			if (info.isDirectory()) {
				working_dir = resolved
			}
		}
		catch {
			// Fall back to default if directory doesn't exist
		}
	}

	setResponseHeaders(event, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
	})

	const response = event.node.res

	const is_claude_home = working_dir === getClaudeHome()
	const system_context = is_claude_home
		? `You are an AI assistant embedded in CC Hub, a dashboard for managing Claude Code configuration files located in ~/.claude/.
You can help users understand their configuration, suggest improvements, and explain what different settings do.
You can read, edit, and write files. Use markdown formatting when appropriate.
${context ? `\nThe user is currently viewing: ${context}` : ''}`
		: `You are an AI coding assistant embedded in CC Hub, working in the directory: ${working_dir}
You have full Claude Code capabilities: you can read, search, edit, and write files, and run shell commands.
Help the user with their codebase. Use markdown formatting when appropriate.
${context ? `\nThe user is currently viewing: ${context}` : ''}`

	function writeSse(data: string): void {
		response.write(`data: ${data}\n\n`)
	}

	try {
		const stream = query({
			prompt,
			options: {
				tools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash'],
				allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash'],
				permissionMode: 'bypassPermissions',
				allowDangerouslySkipPermissions: true,
				systemPrompt: system_context,
				cwd: working_dir,
				model: 'claude-sonnet-4-5-20250929',
				maxTurns: 20,
				maxBudgetUsd: 1.00,
				includePartialMessages: true,
				persistSession: true,
				stderr: (data: string) => {
					console.error('[Agent SDK stderr]', data)
				},
				env: { ...process.env },
				...(id_session ? { resume: id_session } : {})
			}
		})

		let id_current_session: string | null = null

		for await (const message of stream as AsyncIterable<SDKMessage>) {
			switch (message.type) {
				case 'system':
					if ('session_id' in message && message.session_id) {
						id_current_session = message.session_id
						writeSse(JSON.stringify({ type: 'session', id_session: id_current_session }))
					}
					break

				case 'stream_event': {
					const evt = message.event
					if (evt.type === 'content_block_delta' && 'delta' in evt) {
						const delta = evt.delta as { type: string; text?: string }
						if (delta.type === 'text_delta' && delta.text) {
							writeSse(JSON.stringify({ type: 'text_delta', content: delta.text }))
						}
					}
					break
				}

				case 'assistant': {
					const content_blocks = message.message?.content
					if (Array.isArray(content_blocks)) {
						for (const block of content_blocks) {
							if (block.type === 'text' && 'text' in block) {
								writeSse(JSON.stringify({ type: 'text', content: block.text }))
							}
						}
					}
					if (message.session_id && !id_current_session) {
						id_current_session = message.session_id
						writeSse(JSON.stringify({ type: 'session', id_session: id_current_session }))
					}
					break
				}

				case 'tool_use_summary':
					writeSse(JSON.stringify({ type: 'tool', summary: message.summary }))
					break

				case 'result': {
					if (message.subtype === 'success' && message.result) {
						writeSse(JSON.stringify({ type: 'result', content: message.result }))
					}
					else if (message.subtype !== 'success') {
						const err_detail = 'errors' in message && Array.isArray((message as any).errors)
							? (message as any).errors.join('; ')
							: message.subtype
						writeSse(JSON.stringify({ type: 'error', message: `Agent: ${err_detail}` }))
					}
					if (message.session_id && !id_current_session) {
						id_current_session = message.session_id
						writeSse(JSON.stringify({ type: 'session', id_session: id_current_session }))
					}
					break
				}
			}
		}

		writeSse('[DONE]')
	}
	catch (error) {
		const message_error = error instanceof Error ? error.message : 'AI query failed'
		writeSse(JSON.stringify({ type: 'error', message: message_error }))
		writeSse('[DONE]')
	}

	response.end()
})
