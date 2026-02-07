import { createSharedComposable } from '@vueuse/core'

export interface ChatMessage {
	id_message: string
	role: 'user' | 'assistant'
	content: string
	time_created: string
}

const _useAiChat = () => {
	const list_messages = ref<ChatMessage[]>([])
	const id_session = ref<string | null>(null)
	const is_streaming = ref(false)
	const text_partial = ref('')
	const path_cwd = ref('')

	// Reset session when cwd changes (different directory = new session)
	watch(path_cwd, () => {
		id_session.value = null
	})

	async function sendMessage(prompt: string, context?: string): Promise<void> {
		if (!prompt.trim() || is_streaming.value) return

		const message_user: ChatMessage = {
			id_message: crypto.randomUUID(),
			role: 'user',
			content: prompt.trim(),
			time_created: new Date().toISOString()
		}
		list_messages.value = [...list_messages.value, message_user]

		is_streaming.value = true
		text_partial.value = ''

		let text_accumulated = ''

		try {
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: prompt.trim(),
					id_session: id_session.value,
					context,
					cwd: path_cwd.value || undefined
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
									id_session.value = data.id_session
								}
								break

							case 'text_delta':
								if (data.content) {
									text_accumulated += data.content
									text_partial.value = text_accumulated
								}
								break

							case 'text':
							case 'result':
								if (data.content) {
									text_accumulated = data.content
									text_partial.value = text_accumulated
								}
								break

							case 'tool':
								if (data.summary) {
									text_accumulated += `\n\n> ${data.summary}\n\n`
									text_partial.value = text_accumulated
								}
								break

							case 'error':
								text_accumulated += `\n\n**Error:** ${data.message || 'Unknown error'}`
								text_partial.value = text_accumulated
								break
						}
					}
					catch {
						// Skip malformed JSON lines
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
				list_messages.value = [...list_messages.value, message_assistant]
			}
		}
		catch (error) {
			const text_error = error instanceof Error ? error.message : 'Failed to get response'
			const message_error: ChatMessage = {
				id_message: crypto.randomUUID(),
				role: 'assistant',
				content: `**Error:** ${text_error}`,
				time_created: new Date().toISOString()
			}
			list_messages.value = [...list_messages.value, message_error]
		}
		finally {
			is_streaming.value = false
			text_partial.value = ''
		}
	}

	function clearChat(): void {
		list_messages.value = []
		id_session.value = null
		is_streaming.value = false
		text_partial.value = ''
	}

	function resumeSession(id: string, cwd: string, messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>): void {
		list_messages.value = messages.map(m => ({
			id_message: crypto.randomUUID(),
			role: m.role,
			content: m.content,
			time_created: m.timestamp
		}))
		id_session.value = id
		path_cwd.value = cwd
	}

	return {
		list_messages,
		id_session,
		is_streaming,
		text_partial,
		path_cwd,
		sendMessage,
		clearChat,
		resumeSession
	}
}

export const useAiChat = createSharedComposable(_useAiChat)
