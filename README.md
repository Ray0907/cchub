# CC-Hub

**Claude Code Web 管理平台** — 用 GUI 管理你的 Claude Code sessions。

## 為什麼需要這個？

Claude Code CLI 很強，但有些事情用 GUI 更順：
- 📋 **總覽** — 一眼看到所有 sessions，不用 `ls ~/.claude/projects`
- 🔍 **搜尋** — 找那個「上週討論 auth 的對話」
- 🗑️ **管理** — 刪除、整理、不讓 sessions 無限膨脹
- 🔄 **同步** — Web 編輯 = CLI 同步，無縫切換

## 功能

### ✅ 已完成

| 功能 | 說明 |
|------|------|
| **Session 列表** | 顯示所有 sessions，按時間排序，顯示標題 + 專案 |
| **Resume 對話** | 點擊繼續對話，狀態與 CLI `claude -r` 同步 |
| **刪除 + Trash** | 刪除移到 `~/.claude/trash/`，保留 metadata 可還原 |

### 🚧 開發中

| 功能 | 優先度 | 說明 |
|------|--------|------|
| **開新 Session** | 🔴 高 | 從 Web 開始新對話，選擇 working directory |
| **搜尋對話** | 🔴 高 | 全文搜尋歷史對話內容 |
| **Project 分組** | 🟡 中 | 按專案資料夾分組顯示 |
| **Session 重命名** | 🟡 中 | 自訂標題，不只用第一句話 |
| **Token 統計** | 🟢 低 | 顯示用量、估算成本 |
| **Trash 還原** | 🟢 低 | 從垃圾桶救回誤刪 session |
| **匯出對話** | 🟢 低 | Markdown / JSON 匯出 |

## 技術架構

```
cc-hub/
├── app/                    # Nuxt frontend
│   ├── pages/ai.vue        # 主頁面
│   └── composables/
│       └── useAiChat.ts    # Chat 狀態管理 + resume
├── server/
│   └── api/ai/
│       ├── sessions.get.ts       # GET /api/ai/sessions
│       └── sessions/[id].get.ts  # GET /api/ai/sessions/:id
│       └── sessions/[id].delete.ts # DELETE /api/ai/sessions/:id
└── README.md
```

### 資料位置

| 路徑 | 用途 |
|------|------|
| `~/.claude/projects/` | Claude Code 原生 session 儲存位置 |
| `~/.claude/trash/` | 刪除的 sessions（含 .meta.json） |

### Session 結構

每個 session 是一個 `.jsonl` 檔：
```
~/.claude/projects/{project-path}/{session-id}.jsonl
```

每行是一個 JSON entry：
```jsonl
{"type":"user","message":{"role":"user","content":"hi"},...}
{"type":"assistant","message":{"role":"assistant","content":"Hello!"},...}
```

## 開發

```bash
# 安裝
pnpm install

# 開發
pnpm dev

# 開啟 http://localhost:3000/ai
```

## 與 CLI 的關係

CC-Hub **不取代** Claude Code CLI，而是互補：

| 場景 | 用什麼 |
|------|--------|
| 寫 code、pair programming | CLI（在 terminal 最順） |
| 找舊對話、管理 sessions | CC-Hub |
| 刪除 / 整理 | CC-Hub |
| 快速開始新專案 | 都可以 |

**同步機制**：兩邊讀寫同一批 `.jsonl` 檔案，天然同步。

## Roadmap

### Phase 1: Core（目前）
- [x] Session list
- [x] Resume session
- [x] Delete + Trash
- [ ] New session
- [ ] Search

### Phase 2: Organization
- [ ] Project grouping
- [ ] Session rename
- [ ] Tags / favorites

### Phase 3: Insights
- [ ] Token usage stats
- [ ] Cost estimation
- [ ] Conversation export

### Phase 4: Collaboration（未定）
- [ ] Share session（read-only link）
- [ ] Team workspace

## License

MIT
