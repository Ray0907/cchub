# Mission Control — 編碼代理人即時儀表板規格文件

**版本**：v1.0 草稿  
**日期**：2026-04-02  
**目標讀者**：實作工程師、評估者

---

## 1. 範疇定義

### v1 包含

- 全新路由 `/mission-control`，作為多代理人監控的主要入口頁面
- 即時 SSE 串流端點，將 Claude Code / claw-code 的 JSONL 活動正規化為統一事件格式
- 遞迴即時任務樹 UI（run → agent → tool → sub-agent 節點層級）
- 每個代理人的即時 token / 費用 / 狀態計數器
- 衝突預測：偵測兩個以上代理人同時寫入同一檔案
- 飛行記錄器：可回放的歷史工作階段

### v1 不包含

- 代理人的啟動、暫停或終止控制（唯讀儀表板）
- 跨機器分散式代理人追蹤（僅限本機 `~/.claude/projects/`）
- AI 自動介入或警報通知（Email、Slack 等）
- 使用者帳號或多租戶功能
- 行動裝置專屬 UI 最佳化
- 自訂定價模型（固定使用現有 Claude Sonnet 報價）

---

## 2. 高階技術設計

### 技術堆疊

與現有專案保持一致，無需引入新依賴：

| 層次 | 技術 |
|------|------|
| 前端框架 | Nuxt 4 + Vue 3 Composition API |
| UI 元件 | Nuxt UI（UCard、UBadge、UDashboard 系列） |
| 樣式 | Tailwind CSS（透過 Nuxt UI） |
| 即時傳輸 | Server-Sent Events（SSE），延續 `/api/ai/chat.post.ts` 模式 |
| 後端 | Nitro（現有 `defineEventHandler`、`defineApiHandler` 模式） |
| 資料來源 | `~/.claude/projects/**/*.jsonl`（現有 `monitoring.get.ts` 已建立讀取模式） |
| 狀態管理 | Vue `ref` / `computed`，不引入 Pinia |

### 主要元件

```
/mission-control（頁面）
├── FlightHeader          — 全域統計列（代理人數、燃燒費用、警示數）
├── AgentGrid             — 代理人卡片網格（5-10 個並列）
│   └── AgentCard         — 單一代理人：名稱、狀態燈、最後操作、費用
├── TaskTree              — 遞迴樹，展示 run→agent→tool→sub-agent 節點
│   └── TreeNode          — 可折疊節點，含狀態圖示與耗時
├── DetailPane            — 選取節點的完整詳細資訊（輸入/輸出、工具參數）
├── ConflictBanner        — 衝突警示橫幅（檔案路徑 + 衝突代理人清單）
└── FlightRecorder        — 回放控制列（時間軸滑桿、播放/暫停/倍速）
```

### 資料流

```
~/.claude/projects/**/*.jsonl
         │
         │ 尾隨讀取（tail -F 語義，每 500ms 輪詢或 fs.watch）
         ▼
/api/mission-control/stream（SSE 端點）
         │
         │ 正規化為 McEvent（見下方事件格式）
         ▼
前端 useEventSource composable
         │
         ├──▶ 任務樹狀態（reactive tree store）
         ├──▶ 費用計數器
         ├──▶ 衝突偵測器（檔案路徑集合比對）
         └──▶ 飛行記錄器緩衝區（環狀佇列，最多 10,000 個事件）
```

### 正規化事件格式（McEvent）

後端 SSE 端點輸出統一的 JSON 物件流，前端不直接解析 JSONL：

```typescript
interface McEvent {
  type: 'agent_start' | 'agent_end' | 'tool_start' | 'tool_end' |
        'text_delta' | 'cost_update' | 'conflict_detected' | 'heartbeat'
  ts: string              // ISO 8601 時間戳
  run_id: string          // 對應 JSONL 檔名（工作階段 ID）
  agent_id: string        // 代理人識別碼（project + session_id 組合）
  tool_name?: string      // tool_start / tool_end 時出現
  file_path?: string      // 寫入操作時出現，用於衝突偵測
  tokens_delta?: number   // 本次事件新增的 token 數
  cost_delta_usd?: number // 本次事件新增的費用
  payload?: unknown       // 工具輸入/輸出原始內容（節錄）
}
```

---

## 3. 功能清單（優先序）

1. **即時代理人任務樹**：以可展開的樹狀結構即時呈現所有執行中代理人的 run → agent → tool → sub-agent 節點層級，讓使用者一眼掌握整個代理人群的執行進度。

2. **即時費用燃燒計數器**：在每個代理人卡片與全域統計列上即時累計顯示 token 用量與美元費用，讓使用者在工作階段結束前即可掌握成本走向。

3. **衝突預測**：當兩個以上代理人的工具呼叫指向同一檔案路徑時，立即在頂部橫幅顯示紅色警示，列出衝突代理人名稱與檔案路徑。

4. **卡住代理人偵測**：若某代理人在可設定的閾值時間（預設 60 秒）內無任何新事件，自動將其卡片標示為「停滯」狀態並顯示警示圖示。

5. **飛行記錄器**：將本次 Mission Control 工作階段的所有事件存入記憶體緩衝區，提供時間軸滑桿讓使用者回放任何歷史時間點的代理人狀態。

6. **選取節點詳細資訊窗格**：點選任務樹中的任一節點後，在右側窗格展開顯示該節點的完整工具輸入、輸出內容、耗時與 token 消耗明細。

---

## 4. 驗收標準

### 功能一：即時代理人任務樹

1. 開啟 `/mission-control` 後，頁面在 2 秒內建立 SSE 連線並顯示連線狀態指示燈。
2. 當一個新的 Claude Code 工作階段在本機啟動時，對應的代理人節點在 3 秒內出現於樹中，無需重新整理頁面。
3. 樹狀結構正確呈現四個層級：run（根）→ agent → tool → sub-agent，層級縮排視覺清晰可辨。
4. 每個節點顯示：名稱、狀態圖示（執行中 / 成功 / 失敗 / 停滯）、已耗時間。
5. 節點可個別折疊與展開，折疊後其所有子節點隱藏。
6. 當代理人完成工作（工作階段結束）後，對應樹節點在 5 秒內更新為「已完成」狀態並保留在樹中。
7. 同時顯示 10 個並列代理人時，UI 不產生明顯卡頓（畫面更新率維持 ≥ 30fps）。

### 功能二：即時費用燃燒計數器

1. 全域統計列顯示所有執行中代理人的累計費用總和（美元），精度至小數點後四位。
2. 每個代理人卡片獨立顯示該代理人的當前費用，費用在收到 `cost_update` 事件後 1 秒內更新。
3. 費用計算採用與現有 `monitoring.get.ts` 相同的定價常數（Input: $3/M、Output: $15/M、Cache Read: $0.3/M、Cache Create: $3.75/M）。
4. Token 計數（input / output）與費用並排顯示，並以色彩區分（藍色 = input，綠色 = output）。
5. 工作階段結束後，該代理人的最終費用仍保留顯示，不歸零。

### 功能三：衝突預測

1. 當代理人 A 的 `tool_start` 事件中 `file_path` 與代理人 B 正在操作中的 `file_path` 相同時，衝突橫幅在 2 秒內出現於頁面頂部。
2. 衝突橫幅顯示：衝突檔案完整路徑、涉及的代理人名稱清單、衝突偵測時間。
3. 衝突橫幅以醒目的紅色或橘色配色呈現，不可被其他 UI 元素遮蓋。
4. 當衝突的所有相關工具呼叫均完成後，衝突橫幅在 10 秒後自動消失。
5. 同時存在多個衝突時，橫幅以清單方式疊加顯示，不相互覆蓋。
6. 僅寫入類工具（Write、Edit）觸發衝突偵測；唯讀工具（Read、Grep、Glob）不觸發。

### 功能四：卡住代理人偵測

1. 若代理人在 60 秒內無任何新 McEvent，其卡片自動切換至「停滯」狀態（黃色警示圖示）。
2. 停滯閾值可在設定中調整（30 / 60 / 120 / 300 秒）。
3. 停滯代理人的最後已知操作名稱與停滯持續時間顯示於卡片上。
4. 代理人恢復活動（收到新事件）後，停滯狀態在 3 秒內自動解除。
5. 停滯代理人以視覺方式（卡片邊框或背景色）與正常執行中代理人區分。

### 功能五：飛行記錄器

1. Mission Control 頁面開啟後，所有 McEvent 自動記錄至記憶體緩衝區（容量上限：10,000 個事件，超過後以 FIFO 方式捨棄最舊事件）。
2. 頁面底部提供時間軸滑桿，拖曳後畫面呈現該時間點的代理人樹狀快照。
3. 提供播放、暫停、2× / 4× 倍速播放控制按鈕。
4. 回放模式下，頁面頂部顯示明顯的「回放中」標示，避免使用者誤認為即時資料。
5. 點選「返回即時」按鈕後，頁面立即恢復顯示最新即時狀態。
6. 飛行記錄器資料不跨頁面重新整理持久化（純記憶體，不寫入磁碟）。

### 功能六：選取節點詳細資訊窗格

1. 點選任務樹中任一節點後，右側詳細資訊窗格立即展開（動畫時間 ≤ 200ms）。
2. 詳細資訊窗格顯示：節點類型、工具名稱（如適用）、開始時間、結束時間、耗時。
3. 工具節點額外顯示：工具輸入參數（JSON 格式，語法高亮）、工具輸出內容（節錄，最多 2000 字元）。
4. 代理人節點顯示：本工作階段累計 token 用量明細（input / output / cache）與費用。
5. 點選其他節點後，窗格內容即時切換至新選取節點，不需關閉再重新打開。
6. 詳細資訊窗格可透過「×」按鈕或按 Escape 鍵關閉，關閉後樹狀結構恢復全寬顯示。

---

## 附錄：與現有程式碼的整合點

| 現有資產 | Mission Control 的使用方式 |
|---------|--------------------------|
| `server/api/monitoring.get.ts` | 提供 JSONL 讀取模式、費用計算函數、`SessionMetrics` 資料結構參考 |
| `server/api/ai/chat.post.ts` | 提供 SSE 標頭設定、`writeSse()` 模式、`[DONE]` 結束訊號慣例 |
| `app/pages/monitoring.vue` | 提供 `formatCompact`、`formatTimeAgo` 等格式化工具的使用範本 |
| `nuxt.config.ts` | 確認使用 `@nuxt/ui`、`@vueuse/nuxt`，可使用 `useEventSource`（VueUse） |
| `app/components/StatCard.vue` | 可重用於飛行記錄器的統計顯示列 |
