import type { ChatMessage } from '~/types'

export interface AgentChatState {
	id_agent: string
	name_agent: string
	id_session: string | null
	list_messages: ChatMessage[]
	is_streaming: boolean
	text_partial: string
	palette: number
}

export function useOfficeChat() {
	const map_chats = ref<Map<string, AgentChatState>>(new Map())
	const id_active = ref<string | null>(null)

	const chat_active = computed(() => {
		if (!id_active.value) return null
		return map_chats.value.get(id_active.value) ?? null
	})

	/** Initialize chat state for an agent (idempotent) */
	function initAgent(id: string, name: string, palette: number): void {
		if (map_chats.value.has(id)) return
		const newMap = new Map(map_chats.value)
		newMap.set(id, {
			id_agent: id,
			name_agent: name,
			id_session: null,
			list_messages: [],
			is_streaming: false,
			text_partial: '',
			palette
		})
		map_chats.value = newMap
	}

	/** Switch active agent */
	function selectAgent(id: string): void {
		if (map_chats.value.has(id)) {
			id_active.value = id
		}
	}

	/** Check if any agent is streaming */
	function isAgentStreaming(id: string): boolean {
		return map_chats.value.get(id)?.is_streaming ?? false
	}

	/** Send a message to the active agent */
	async function sendMessage(prompt: string): Promise<void> {
		const agentId = id_active.value
		if (!agentId || !prompt.trim()) return

		const chat = map_chats.value.get(agentId)
		if (!chat || chat.is_streaming) return

		// Add user message
		const message_user: ChatMessage = {
			id_message: crypto.randomUUID(),
			role: 'user',
			content: prompt.trim(),
			time_created: new Date().toISOString()
		}
		chat.list_messages = [...chat.list_messages, message_user]
		chat.is_streaming = true
		chat.text_partial = ''
		map_chats.value = new Map(map_chats.value)

		let text_accumulated = ''

		try {
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: prompt.trim(),
					id_session: chat.id_session,
					agent: agentId
				})
			})

			if (!response.ok || !response.body) {
				throw new Error(`Request failed: ${response.status}`)
			}

			const reader = response.body.getReader()
			const decoder = new TextDecoder()
			let buffer = ''

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() || ''

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue
					const payload = line.slice(6).trim()
					if (payload === '[DONE]') continue

					try {
						const data = JSON.parse(payload) as {
							type: string
							content?: string
							id_session?: string
							summary?: string
							message?: string
						}

						switch (data.type) {
							case 'session':
								if (data.id_session) {
									chat.id_session = data.id_session
								}
								break
							case 'text_delta':
								if (data.content) {
									text_accumulated += data.content
									chat.text_partial = text_accumulated
								}
								break
							case 'text':
							case 'result':
								if (data.content) {
									text_accumulated = data.content
									chat.text_partial = text_accumulated
								}
								break
							case 'tool':
								if (data.summary) {
									text_accumulated += `\n\n> ${data.summary}\n\n`
									chat.text_partial = text_accumulated
								}
								break
							case 'error':
								text_accumulated += `\n\n**Error:** ${data.message || 'Unknown error'}`
								chat.text_partial = text_accumulated
								break
						}
						map_chats.value = new Map(map_chats.value)
					}
					catch {
						// Skip malformed JSON
					}
				}
			}

			if (text_accumulated.trim()) {
				const message_assistant: ChatMessage = {
					id_message: crypto.randomUUID(),
					role: 'assistant',
					content: text_accumulated.trim(),
					time_created: new Date().toISOString()
				}
				chat.list_messages = [...chat.list_messages, message_assistant]
			}
		}
		catch (error) {
			const text_error = error instanceof Error ? error.message : 'Failed to get response'
			chat.list_messages = [...chat.list_messages, {
				id_message: crypto.randomUUID(),
				role: 'assistant',
				content: `**Error:** ${text_error}`,
				time_created: new Date().toISOString()
			}]
		}
		finally {
			chat.is_streaming = false
			chat.text_partial = ''
			map_chats.value = new Map(map_chats.value)
		}
	}

	return {
		map_chats,
		id_active,
		chat_active,
		initAgent,
		selectAgent,
		isAgentStreaming,
		sendMessage
	}
}
