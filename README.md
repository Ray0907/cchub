# CC Hub

Web dashboard for managing Claude Code configuration, sessions, and settings.

![CC Hub Demo](https://github.com/user-attachments/assets/15070ade-4789-40cb-aa5d-f3330510365b)

> **Requires an active [Claude Pro/Team/Enterprise subscription](https://claude.ai/pricing) with Claude Code access.** The AI assistant feature uses the Claude Agent SDK which authenticates through your Claude Code CLI login.

## Why?

Claude Code CLI is powerful, but some tasks are easier with a GUI:
- **Overview** — See all sessions at a glance instead of `ls ~/.claude/projects`
- **Search** — Find that auth discussion from last week
- **Manage** — Delete, archive, restore sessions without manual file wrangling
- **Edit** — Modify agents, rules, hooks, MCP servers, and settings through a web UI

## Features

| Feature | Description |
|---------|-------------|
| **Session Manager** | List, search, filter by project, with 300ms debounced search |
| **Resume Sessions** | Click to continue a conversation, syncs with CLI `claude -r` |
| **Archive / Trash** | Soft-delete to `~/.claude/trash/`, restore or permanently delete |
| **Config Dashboard** | Browse and edit agents, rules, hooks, MCP servers, commands, plugins, settings |
| **CLAUDE.md Editor** | Edit your project instructions with live markdown preview |
| **AI Assistant** | Integrated web Claude Code with full tool access |
| **Auth Middleware** | Per-start random token, httpOnly cookie, Bearer header support |

## Tech Stack

- **Frontend**: Nuxt 3 + Nuxt UI + VueUse
- **Backend**: Nitro server with `~/.claude/` filesystem APIs
- **AI**: `@anthropic-ai/claude-agent-sdk` with SSE streaming
- **Auth**: Random token per server start, cookie-based for browser, Bearer for scripts

## Project Structure

```
cc-hub/
├── app/
│   ├── pages/
│   │   ├── ai/index.vue          # Full-page Claude Code
│   │   ├── ai/sessions.vue       # Session manager
│   │   └── ...                   # Config dashboard pages
│   ├── composables/useAiChat.ts  # Chat state + SSE streaming
│   └── utils/format.ts           # Shared formatting utilities
├── server/
│   ├── api/ai/
│   │   ├── chat.post.ts          # AI chat endpoint (SSE)
│   │   ├── sessions.get.ts       # Session list + search
│   │   └── sessions/             # Session CRUD + archive
│   ├── api/                      # Config CRUD endpoints
│   ├── middleware/api-auth.ts     # Auth middleware
│   └── utils/                    # Path guard, frontmatter parser, etc.
└── public/favicon.svg
```

## Data Layout

| Path | Purpose |
|------|---------|
| `~/.claude/projects/` | Claude Code session storage (`.jsonl` files) |
| `~/.claude/trash/` | Archived sessions with `.meta.json` for restore |
| `~/.claude/agents/` | Agent definitions (`.md` with frontmatter) |
| `~/.claude/rules/` | Custom rules |
| `~/.claude/history.jsonl` | CLI command history |
| `~/.claude/history-archived.jsonl` | Archived history entries (created by CC Hub) |
| `~/.claude/settings.json` | Global settings |
| `~/.claude/mcp.json` | MCP server configuration |

## Getting Started

```bash
pnpm install
pnpm dev
# Open http://127.0.0.1:3200
```

The auth token is printed to the console on startup for programmatic access (curl, scripts).

## Relationship with Claude Code CLI

CC Hub **complements** the CLI — it doesn't replace it.

| Scenario | Use |
|----------|-----|
| Coding, pair programming | CLI (native terminal experience) |
| Finding old conversations | CC Hub |
| Managing sessions, bulk cleanup | CC Hub |
| Editing config files | CC Hub or CLI |

Both read/write the same `~/.claude/` files — naturally in sync.

## Heads Up: This Tool Writes to Real Files

CC Hub reads **and writes** to your `~/.claude/` directory. Edits you make (agents, rules, hooks, settings, CLAUDE.md) are saved directly to disk — there is no sandbox or dry-run mode.

This was a deliberate design choice. The original motivation: Claude Code CLI has no built-in way to delete or archive sessions. The only option was manually removing `.jsonl` files from `~/.claude/projects/`. CC Hub was built to fill that gap, and naturally expanded to cover editing config files too.

**What this means:**
- Archive/delete/restore operations move or remove actual session files
- Editing an agent, rule, or setting overwrites the real file (a `.bak` backup is created first)
- History archive writes to `~/.claude/history-archived.jsonl`

If you want to be cautious, back up `~/.claude/` before first use.

## Security

- All `/api/**` routes require authentication (cookie or Bearer token)
- Path traversal protection via `resolveClaudePath` + `safeJoin` + `assertSafeSegment`
- Concurrent file writes serialized via async mutex (no race conditions)
- Error messages sanitized (no filesystem path leakage)
- `gray-matter` JS eval engine disabled
- Agent SDK env vars restricted to safe allowlist
- CORS disabled on API routes

## License

MIT
