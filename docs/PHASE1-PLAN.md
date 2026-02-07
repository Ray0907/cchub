# Phase 1: Core — Implementation Plan

> 目標：讓 CC-Hub 能完全取代 Claude Code CLI 的日常操作

## 🎯 First Principles Analysis

### 問題本質

**使用者的核心需求是什麼？**

```
我想用 AI 幫我寫 code
↓
我需要能「開始對話」「繼續對話」「找到對話」「清理對話」
↓
CLI 能做，但 GUI 讓這些事更快、更直覺
```

### 目前狀態 vs 目標狀態

| 能力 | CLI | CC-Hub 現況 | CC-Hub 目標 |
|------|-----|-------------|-------------|
| 開新對話 | `claude` | ❌ | ✅ |
| 繼續對話 | `claude -r ID` | ✅ | ✅ |
| 列出對話 | 手動找檔案 | ✅ | ✅ |
| 搜尋對話 | `grep` | ❌ | ✅ |
| 刪除對話 | `rm` | ✅ | ✅ |

**Phase 1 完成後 = CLI 平替 ✅**

---

## 📋 Feature 1: New Session

### User Story

```
作為一個開發者
我想從 Web 介面開始新的 Claude Code 對話
這樣我不用切換到 terminal
```

### 設計決策

**Q1: 開新 session 需要什麼資訊？**

| 欄位 | 必要性 | 說明 |
|------|--------|------|
| Working Directory | 必要 | Claude Code 需要知道在哪個專案工作 |
| 初始訊息 | 必要 | 第一句話 |
| Model | 選填 | 預設用 claude-sonnet-4-20250514 |

**Q2: Working Directory 怎麼選？**

方案比較：
| 方案 | 優點 | 缺點 |
|------|------|------|
| A. 手打路徑 | 簡單 | UX 差、容易錯 |
| B. 下拉選單（最近專案） | 快速 | 新專案要手打 |
| C. 檔案瀏覽器 | 完整 | 開發成本高 |
| **D. 下拉 + 手打** | 平衡 | ✅ 推薦 |

→ **採用 D**：下拉顯示最近 10 個專案，可手動輸入新路徑

**Q3: Session ID 誰產生？**

→ Claude Code SDK 自動產生 UUID，我們不用管

### API 設計

```typescript
// POST /api/ai/sessions
interface CreateSessionRequest {
  cwd: string           // working directory
  message: string       // 初始訊息
  model?: string        // 選填
}

interface CreateSessionResponse {
  id: string            // session UUID
  response: string      // Claude 的回應
}
```

### UI 設計

```
┌─────────────────────────────────────────┐
│  🆕 New Session                         │
├─────────────────────────────────────────┤
│  Working Directory:                     │
│  ┌─────────────────────────────────┐   │
│  │ ~/Documents/cc-hub          ▼   │   │
│  └─────────────────────────────────┘   │
│  Recent: cc-hub | ray | taicca | ...   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ What do you want to build?      │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│             [ Start Session ]           │
└─────────────────────────────────────────┘
```

### 實作步驟

1. **API**: `server/api/ai/sessions.post.ts`
   - 接收 cwd + message
   - 呼叫 Claude Code SDK
   - 回傳 session ID + response

2. **Composable**: `useAiChat.ts` 加 `createSession()`
   - 建立新 session 狀態
   - 設定 cwd

3. **UI**: `ai.vue` 加 New Session modal/form
   - Working directory 選擇器
   - 訊息輸入框
   - 送出後導向對話畫面

### Edge Cases

| Case | 處理 |
|------|------|
| cwd 不存在 | API 回 400，UI 顯示錯誤 |
| cwd 沒權限 | API 回 403，UI 顯示錯誤 |
| 空訊息 | 前端驗證阻擋 |
| SDK 錯誤 | 回 500 + error message |

---

## 📋 Feature 2: Search

### User Story

```
作為一個開發者
我想搜尋過去的對話內容
這樣我能快速找到之前討論過的解決方案
```

### 設計決策

**Q1: 搜什麼？**

| 範圍 | 說明 | 推薦 |
|------|------|------|
| Session 標題 | 只搜第一句話 | 太淺 |
| 全部內容 | User + Assistant 所有文字 | ✅ |
| Code blocks only | 只搜程式碼 | 可加 filter |

→ **全文搜尋**，可選 filter

**Q2: 搜尋架構？**

| 方案 | 優點 | 缺點 |
|------|------|------|
| A. 每次 grep 全部檔案 | 簡單 | 慢（219 sessions = 64MB） |
| B. SQLite FTS | 快 | 需要 index、sync 問題 |
| C. 前端記憶體搜尋 | 即時 | 載入慢、記憶體大 |
| **D. 串流 grep + 快取** | 平衡 | ✅ 推薦 |

→ **採用 D**：
- 第一次搜尋：背景 grep，串流結果
- 快取最近搜尋結果
- 未來可升級到 SQLite FTS

**Q3: 搜尋結果顯示什麼？**

```
┌─────────────────────────────────────────┐
│ 🔍 "authentication"                     │
├─────────────────────────────────────────┤
│ 📁 cc-hub — 2 matches                   │
│   └ "...implement JWT authentication..." │
│   └ "...OAuth2 authentication flow..."  │
│                                          │
│ 📁 taicca — 1 match                     │
│   └ "...basic auth header..."           │
└─────────────────────────────────────────┘
```

### API 設計

```typescript
// GET /api/ai/sessions/search?q=keyword
interface SearchRequest {
  q: string             // 搜尋關鍵字
  project?: string      // 過濾特定專案
  limit?: number        // 結果上限（預設 50）
}

interface SearchResult {
  sessionId: string
  project: string
  title: string
  matches: {
    text: string        // 匹配的片段（前後 50 字）
    role: 'user' | 'assistant'
    line: number
  }[]
  time_modified: string
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  tookMs: number
}
```

### 實作步驟

1. **API**: `server/api/ai/sessions/search.get.ts`
   - 接收 query string
   - 遍歷所有 .jsonl
   - 用 readline 逐行搜尋（記憶體友善）
   - 擷取 context（前後 50 字）
   - 回傳結果

2. **Composable**: `useSessionSearch.ts`
   - 搜尋狀態管理
   - debounce 輸入
   - 快取結果

3. **UI**: Search bar + results
   - Cmd+K 開啟搜尋
   - 即時顯示結果
   - 點擊 → 開啟該 session 並 highlight

### 效能考量

| 情況 | 預估時間 | 優化 |
|------|----------|------|
| 64MB / 219 sessions | 200-500ms | 可接受 |
| 100MB+ | 1s+ | 需要 index |

**優化策略（未來）：**
1. 建立搜尋 index（SQLite FTS5）
2. 增量更新（只 index 新/改的 session）
3. Worker thread 背景搜尋

### Edge Cases

| Case | 處理 |
|------|------|
| 空搜尋 | 不送 API |
| 特殊字元 | escape regex |
| 搜尋中斷 | AbortController 取消 |
| 無結果 | 顯示「No results」 |
| 太多結果 | 分頁 or 「Show more」 |

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// sessions.post.test.ts
describe('POST /api/ai/sessions', () => {
  it('creates session with valid cwd', async () => { ... })
  it('returns 400 for invalid cwd', async () => { ... })
  it('returns 400 for empty message', async () => { ... })
})

// search.get.test.ts
describe('GET /api/ai/sessions/search', () => {
  it('finds matches in user messages', async () => { ... })
  it('finds matches in assistant messages', async () => { ... })
  it('returns empty array for no matches', async () => { ... })
  it('respects limit parameter', async () => { ... })
})
```

### E2E Tests (agent-browser)

```
Test 1: New Session
1. 開 /ai
2. 點 "New Session"
3. 選 cwd
4. 輸入訊息
5. 送出
6. 驗證對話開始

Test 2: Search
1. 開 /ai
2. Cmd+K 開搜尋
3. 輸入關鍵字
4. 驗證結果顯示
5. 點擊結果
6. 驗證 session 開啟
```

---

## 📅 Implementation Order

```
Week 1: New Session
├── Day 1-2: API + SDK integration
├── Day 3-4: UI + composable
└── Day 5: Testing + polish

Week 2: Search
├── Day 1-2: Search API (streaming grep)
├── Day 3-4: UI + Cmd+K
└── Day 5: Testing + polish
```

---

## ✅ Success Criteria

Phase 1 完成的定義：

- [ ] 能從 Web 開始新對話（選 cwd → 輸入 → 得到回應）
- [ ] 能搜尋所有歷史對話（關鍵字 → 結果 → 跳轉）
- [ ] 兩個功能都與 CLI 同步（Web 建的 session CLI 看得到，反之亦然）
- [ ] 效能可接受（新 session < 2s，搜尋 < 1s）
- [ ] 有 E2E 測試驗證

---

## 🚀 After Phase 1

完成後的 CC-Hub：

```
✅ List sessions
✅ Resume session  
✅ Delete session
✅ New session
✅ Search

= 完整取代 CLI 日常操作 🎉
```

接下來可以做：
- Phase 2: Organization（分組、重命名）
- 或 Open Source 發布 MVP
