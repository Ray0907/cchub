<script setup lang="ts">
import { TILE_SIZE, CharacterState, Direction, type OfficeCharacter } from '~/utils/office/types'
import { AGENT_SEATS } from '~/utils/office/layout'

useSeoMeta({ title: 'Office' })

const { map_chats, id_active, chat_active, initAgent, selectAgent, isAgentStreaming, sendMessage } = useOfficeChat()

// Fetch agents from API
const { data: data_agents } = await useFetch('/api/agents')

// Build characters from agents
const characters = ref<OfficeCharacter[]>([])

watch(data_agents, (agents) => {
	if (!agents) return
	const chars: OfficeCharacter[] = []
	for (let i = 0; i < agents.length && i < AGENT_SEATS.length; i++) {
		const agent = agents[i]
		const seat = AGENT_SEATS[i]
		const ch: OfficeCharacter = {
			id: agent.name_file,
			name: agent.name_agent || agent.name_file,
			state: CharacterState.IDLE,
			dir: seat.facingDir,
			x: seat.col * TILE_SIZE + TILE_SIZE / 2,
			y: seat.row * TILE_SIZE + TILE_SIZE / 2,
			tileCol: seat.col,
			tileRow: seat.row,
			palette: i % 6,
			frame: 0,
			frameTimer: 0,
			isActive: false,
			seat
		}
		chars.push(ch)
		initAgent(agent.name_file, agent.name_agent || agent.name_file, i % 6)
	}
	characters.value = chars
}, { immediate: true })

// Sync streaming state -> character animation
watch(map_chats, (chats) => {
	for (const ch of characters.value) {
		const chatState = chats.get(ch.id)
		const streaming = chatState?.is_streaming ?? false
		ch.isActive = streaming
		ch.state = streaming ? CharacterState.TYPE : CharacterState.IDLE
	}
}, { deep: true })

function handleSelectAgent(id: string) {
	selectAgent(id)
}

async function handleSendMessage(prompt: string) {
	await sendMessage(prompt)
}

const count_agents = computed(() => characters.value.length)
</script>

<template>
	<UDashboardPanel id="office">
		<template #header>
			<UDashboardNavbar>
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #title>
					<div class="flex items-center gap-2">
						<UIcon name="i-lucide-building-2" class="size-4 text-primary" />
						<span>Office</span>
						<UBadge v-if="count_agents > 0" color="neutral" variant="subtle" size="xs">
							{{ count_agents }}
						</UBadge>
					</div>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="flex flex-col h-full">
				<!-- Canvas area (top 55%) -->
				<div class="h-[55%] min-h-48 border-b border-default">
					<OfficeCanvas
						:characters="characters"
						:selected-id="id_active"
						@select="handleSelectAgent"
						@hover="() => {}"
					/>
				</div>

				<!-- Chat panel (bottom) -->
				<div class="flex-1 min-h-0">
					<OfficeChatPanel
						:chat="chat_active"
						:all-chats="map_chats"
						@send="handleSendMessage"
						@select-agent="handleSelectAgent"
					/>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
