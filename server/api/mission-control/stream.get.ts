import type { McEvent } from '../../../app/composables/useMissionControl'
import {
	listMissionControlJsonlFiles,
	normalizeMissionControlLine,
	readPendingMissionControlLines,
	type MissionControlFileState
} from '../../utils/missionControl'

const POLL_INTERVAL_MS = 500
const HEARTBEAT_INTERVAL_MS = 5000

export default defineEventHandler(async (event) => {
	setResponseHeaders(event, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
	})

	const response = event.node.res
	const dir_projects = resolveClaudePath('projects')
	const map_files = new Map<string, MissionControlFileState>()
	let is_closed = false
	let is_polling = false
	let ts_last_emit = Date.now()

	function write_event(evt: McEvent): void {
		if (is_closed || response.writableEnded || response.destroyed) return
		response.write(`data: ${JSON.stringify(evt)}\n\n`)
		ts_last_emit = Date.now()
	}

	function cleanup(): void {
		is_closed = true
		clearInterval(id_poll)
		if (!response.writableEnded && !response.destroyed) {
			response.end()
		}
	}

	async function poll(): Promise<void> {
		if (is_closed || is_polling) return
		is_polling = true

		try {
			const list_files = await listMissionControlJsonlFiles(dir_projects)
			for (const path_file of list_files) {
				const state_file = map_files.get(path_file) ?? {
					offset: 0,
					remainder: '',
					has_started: false,
					open_tools: new Map()
				}

				const chunks = await readPendingMissionControlLines(path_file, state_file)
				map_files.set(path_file, state_file)

				for (const line of chunks) {
					const list_events = normalizeMissionControlLine(line, path_file, dir_projects, state_file)
					for (const evt of list_events) {
						write_event(evt)
					}
				}
			}

			if (Date.now() - ts_last_emit >= HEARTBEAT_INTERVAL_MS) {
				write_event({
					type: 'heartbeat',
					ts: new Date().toISOString(),
					run_id: 'heartbeat',
					agent_id: 'heartbeat'
				})
			}
		} catch (error) {
			console.error('[Mission Control Stream Error]', error)
		} finally {
			is_polling = false
		}
	}

	const id_poll = setInterval(poll, POLL_INTERVAL_MS)
	event.node.req.on('close', cleanup)
	event.node.req.on('aborted', cleanup)

	await poll()
})
