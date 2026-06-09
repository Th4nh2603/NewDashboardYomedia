# Chat — Sơ đồ luồng

**YoMedia Dashboard · NovaAI Assistant**  
*Tài liệu sơ đồ · Cập nhật: 2026-06-09*

> Chi tiết đầy đủ (agents, Build Demo, API, debug): [`chat-agent-flow.md`](./chat-agent-flow.md)  
> Kiến trúc Build Demo: [`server-build-demo-architecture.md`](./server-build-demo-architecture.md)

---

## 1. Tổng quan end-to-end

Mọi tin chat đi qua **một endpoint** `rag.query` (tRPC). Frontend không gọi LLM trực tiếp.

```mermaid
flowchart TB
  subgraph FE["Frontend — Chat.tsx"]
    U[User gõ tin / đính kèm file]
  end

  subgraph FE2["Frontend — xử lý gửi"]
    SEND[handleSend]
    LS[(localStorage<br/>conversations)]
    PROG[BuildDemoProgress<br/>nếu cần]
    B64[Đọc file → base64]
    TRPC_CALL["api.rag.query()"]
    ZIP[Tải ZIP placement codes<br/>nếu server trả về]
    REPLY[Hiển thị tin assistant]
    ERR[Tin system lỗi]
  end

  subgraph API["tRPC — controllers/chat/rag.ts"]
    AUTH[protectedProcedure<br/>assertChatAccess]
    MUT[rag.query mutation]
  end

  subgraph ORCH["Orchestration — runSupervisor"]
    GR[Input guardrails]
    MEM[Short memory<br/>history + attachments]
    ROUTE[resolveRoute<br/>phân loại intent]
    AGENTS[runAgents<br/>song song]
    COMPOSE[composeMultiResponse]
    SAVE[appendShortMemoryTurn]
    LOG[logChatEvent]
  end

  U --> SEND
  SEND --> LS
  SEND --> PROG
  SEND --> B64 --> TRPC_CALL
  TRPC_CALL --> AUTH --> MUT --> GR
  GR -->|chặn| ERR
  GR --> MEM --> ROUTE --> AGENTS --> COMPOSE --> SAVE --> LOG
  LOG --> TRPC_CALL
  TRPC_CALL -->|ok + placementCodesDownload| ZIP --> REPLY
  TRPC_CALL -->|ok| REPLY
  TRPC_CALL -->|lỗi| ERR
  REPLY --> LS
```

### File chính

| Lớp | File |
|-----|------|
| UI | `apps/web/components/Chat.tsx` |
| API client | `apps/web/lib/trpc/api.ts` |
| tRPC router | `apps/server/src/controllers/chat/rag.ts` |
| Entry orchestration | `apps/server/src/lib/ai/orchestration/answerWithRag.ts` |
| Supervisor | `apps/server/src/lib/ai/agents/supervisor/runSupervisor.ts` |

---

## 2. Phân luồng intent (`resolveRoute`)

```mermaid
flowchart TD
  Q[Câu hỏi + history + attachments]
  CAND[detectAgentCandidates<br/>rag / sql / dashboard]
  TOOL[resolveActionTool<br/>help, time, download codes,<br/>build demo, upload SFTP]

  Q --> CAND
  Q --> TOOL

  TOOL -->|tool + knowledge QA| RAG_ONLY["→ rag"]
  TOOL -->|tool + agent khác| MULTI_TOOL["→ actions + candidates"]
  TOOL -->|chỉ tool| ACTIONS_ONLY["→ actions"]
  TOOL -->|không tool| CAND

  CAND -->|nhiều agent| MULTI["→ multi-intent<br/>chạy song song"]
  CAND -->|1 agent| SINGLE["→ rag / sql / dashboard"]
  CAND -->|không khớp| LLM[LLM classify hoặc rule]

  LLM --> SQL[sql]
  LLM --> DASH[dashboard]
  LLM --> RAG[rag]
  LLM --> ACT[actions]
  LLM --> FREE[free_chat]
```

**Ghi chú:** Nếu user đang trong phiên Build Demo nhưng câu hỏi là Knowledge QA (scoring ≥ ngưỡng RAG) → router ưu tiên **rag** thay vì actions.

---

## 3. Các agent backend

```mermaid
flowchart LR
  subgraph Agents
    A1[actions]
    A2[rag]
    A3[free_chat]
    A4[sql]
    A5[dashboard]
  end

  A1 --> T1[Build Demo<br/>compress / upload SFTP]
  A1 --> T2[Download placement codes]
  A1 --> T3[help, time_now…]

  A2 --> R1[retrieveKnowledgeContext]
  R1 --> R2[callProvider Gemini/OpenAI<br/>fallback nếu lỗi]

  A3 --> F1[callProvider trực tiếp]

  A4 --> S1[SQL query agent]
  A5 --> D1[Dashboard insight agent]

  T1 & T2 & T3 & R2 & F1 & S1 & D1 --> OUT[composeMultiResponse<br/>gộp câu trả lời]
```

---

## 4. Luồng gửi tin (Frontend)

| Bước | Hành động |
|------|-----------|
| 1 | User submit → tạo bubble `user`, cập nhật state |
| 2 | Nếu heuristic Build Demo → hiện `BuildDemoProgress` (progress giả lập) |
| 3 | File đính kèm → `readFileAsDataUrl` → `contentBase64` |
| 4 | Gọi `api.rag.query(question, provider, attachments, sessionId)` — `sessionId` = `conversation.id` |
| 5 | Nếu response có `placementCodesDownload` → `downloadPlacementCodesZip` trên client |
| 6 | Thêm bubble `assistant`; lưu vào `localStorage` (`yomedia.chat.conversations.v1`) |
| 7 | Lỗi → bubble `system` qua `handleApiError` |

```mermaid
sequenceDiagram
  participant U as User
  participant C as Chat.tsx
  participant API as api.rag.query
  participant S as runSupervisor

  U->>C: Gửi tin (+ file optional)
  C->>C: Lưu bubble user (localStorage)
  C->>C: base64 attachments
  C->>API: question, provider, sessionId, attachments
  API->>S: answerWithRag
  S-->>API: answer, intent, buildDemoProcessing, placementCodesDownload
  alt placementCodesDownload
    C->>C: downloadPlacementCodesZip
  end
  C->>C: Lưu bubble assistant
```

---

## 5. Session & memory

UI và ngữ cảnh LLM trên server **tách biệt**. Refresh trang hoặc xóa bubble không tự xóa short memory server.

```mermaid
flowchart LR
  FE_ID[conversation.id<br/>frontend]
  MEM_KEY[buildShortMemoryKey<br/>email + role + sessionId]
  SHORT[(Short memory<br/>server — lịch sử hội thoại)]
  LOCAL[(localStorage<br/>UI conversations)]
  BD_ATT[(buildDemoAttachments<br/>file chờ upload)]

  FE_ID --> MEM_KEY --> SHORT
  MEM_KEY --> BD_ATT
  LOCAL -.->|chỉ hiển thị UI| FE_ID
  CLEAR[rag.clearSession] --> SHORT
  CLEAR --> BD_ATT
```

| Loại | Nơi lưu | Mục đích |
|------|---------|----------|
| Conversations | `localStorage` | UI, tối đa 30 hội thoại |
| Short memory | Server RAM | Context LLM (8 turn, TTL 2h) |
| Build Demo files | Server `buildDemoAttachments` | File nhiều lượt trước khi upload |

**Xóa phiên:** reset messages trên UI + `api.rag.clearSession({ sessionId })`.

---

## 6. Sequence server (tóm tắt)

```mermaid
sequenceDiagram
  participant R as ragRouter
  participant A as answerWithRag
  participant S as runSupervisor
  participant RT as resolveRoute
  participant AG as runAgents
  participant M as shortMemory

  R->>A: question, provider, attachments, sessionId, req
  A->>S: runSupervisor
  S->>S: runInputGuardrails
  S->>M: getShortMemory + mergeBuildDemoAttachments
  S->>RT: resolveRoute
  RT-->>S: agents[], intent
  S->>AG: Promise.all(agents)
  AG-->>S: AgentResult[]
  S->>S: composeMultiResponse
  S->>M: appendShortMemoryTurn
  S-->>R: SupervisorResult
```

---

## 7. Điểm cần nhớ

1. **Supervisor pattern:** guardrails → route intent → chạy agent(s) song song → gộp response → log.
2. **Ưu tiên action vs RAG:** câu hỏi kiến thức trong phiên Build Demo vẫn có thể route vào `rag`.
3. **Provider:** user chọn Gemini/OpenAI; agent fallback sang provider còn lại nếu lỗi.
4. **Side effects:** Build Demo (SFTP) và download placement codes xử lý ở agent `actions`; frontend chỉ hiển thị progress / tải ZIP.
5. **Progress bar:** heuristic client (`buildDemoChatProgress.ts`) — không phản ánh chính xác tiến độ SFTP; tin cậy field `buildDemoProcessing` từ server.

---

*Tài liệu đồng bộ với codebase YoMedia Dashboard · Cập nhật 2026-06-09*
