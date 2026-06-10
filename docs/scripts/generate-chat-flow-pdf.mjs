/**
 * Generate docs/chat-flow.pdf from chat-flow.md mermaid diagrams.
 * Usage: node docs/scripts/generate-chat-flow-pdf.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..');
const outPdf = join(docsDir, 'chat-flow.pdf');
const outHtml = join(docsDir, 'chat-flow-diagrams.html');

const sections = [
  {
    title: '1. Tổng quan end-to-end',
    subtitle: 'Mọi tin chat đi qua một endpoint rag.query (tRPC). Frontend không gọi LLM trực tiếp.',
    diagram: `flowchart TB
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
  REPLY --> LS`,
  },
  {
    title: '2. Phân luồng intent (resolveRoute)',
    subtitle:
      'Nếu user đang trong phiên Build Demo nhưng câu hỏi là Knowledge QA (scoring ≥ ngưỡng RAG) → router ưu tiên rag thay vì actions.',
    diagram: `flowchart TD
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
  LLM --> FREE[free_chat]`,
  },
  {
    title: '3. Các agent backend',
    diagram: `flowchart LR
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

  T1 & T2 & T3 & R2 & F1 & S1 & D1 --> OUT[composeMultiResponse<br/>gộp câu trả lời]`,
  },
  {
    title: '4. Luồng gửi tin (Frontend)',
    diagram: `sequenceDiagram
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
  C->>C: Lưu bubble assistant`,
  },
  {
    title: '5. Session & memory',
    subtitle: 'UI và ngữ cảnh LLM trên server tách biệt. Refresh trang không xóa short memory server.',
    diagram: `flowchart LR
  FE_ID[conversation.id<br/>frontend]
  MEM_KEY[buildShortMemoryKey<br/>email + role + sessionId]
  SHORT[(Short memory<br/>server — lịch sử hội thoại)]
  LOCAL[(localStorage<br/>UI conversations)]
  BD_ATT[(buildDemoAttachments<br/>file chờ upload)]

  FE_ID --> MEM_KEY --> SHORT
  MEM_KEY --> BD_ATT
  LOCAL -.->|chỉ hiển thị UI| FE_ID
  CLEAR[rag.clearSession] --> SHORT
  CLEAR --> BD_ATT`,
  },
  {
    title: '6. Sequence server (tóm tắt)',
    diagram: `sequenceDiagram
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
  S-->>R: SupervisorResult`,
  },
];

const sectionHtml = sections
  .map(
    (s, i) => `
  <section class="page">
    <h2>${s.title}</h2>
    ${s.subtitle ? `<p class="subtitle">${s.subtitle}</p>` : ''}
    <div class="diagram-wrap">
      <pre class="mermaid" id="diagram-${i}">${s.diagram}</pre>
    </div>
  </section>`
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Chat Flow — YoMedia Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #1a1a2e;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .cover {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: #f8fafc;
    }
    .cover h1 { font-size: 2.2rem; margin: 0 0 0.5rem; }
    .cover .meta { opacity: 0.85; font-size: 1rem; margin-top: 1rem; }
    .cover .toc { margin-top: 3rem; text-align: left; max-width: 520px; }
    .cover .toc li { margin: 0.4rem 0; }
    section.page {
      page-break-after: always;
      padding: 1rem 1.5rem 2rem;
      min-height: 100vh;
    }
    h2 {
      font-size: 1.35rem;
      color: #0f172a;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.35rem;
      margin: 0 0 0.75rem;
    }
    .subtitle {
      color: #475569;
      font-size: 0.9rem;
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    .diagram-wrap {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow: visible;
    }
    .mermaid { width: 100%; }
    .mermaid svg { max-width: 100%; height: auto; }
    .notes {
      page-break-before: always;
      padding: 1.5rem 2rem;
    }
    .notes h2 { margin-bottom: 1rem; }
    .notes ol { line-height: 1.8; color: #334155; }
    .notes li { margin-bottom: 0.5rem; }
    footer {
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>Chat — Sơ đồ luồng</h1>
    <p class="meta"><strong>YoMedia Dashboard · NovaAI Assistant</strong><br/>Tài liệu sơ đồ · Cập nhật: 2026-06-09</p>
    <ul class="toc">
      ${sections.map((s) => `<li>${s.title}</li>`).join('')}
      <li>7. Điểm cần nhớ</li>
    </ul>
  </div>

  ${sectionHtml}

  <section class="notes">
    <h2>7. Điểm cần nhớ</h2>
    <ol>
      <li><strong>Supervisor pattern:</strong> guardrails → route intent → chạy agent(s) song song → gộp response → log.</li>
      <li><strong>Ưu tiên action vs RAG:</strong> câu hỏi kiến thức trong phiên Build Demo vẫn có thể route vào <code>rag</code>.</li>
      <li><strong>Provider:</strong> user chọn Gemini/OpenAI; agent fallback sang provider còn lại nếu lỗi.</li>
      <li><strong>Side effects:</strong> Build Demo (SFTP) và download placement codes xử lý ở agent <code>actions</code>; frontend chỉ hiển thị progress / tải ZIP.</li>
      <li><strong>Progress bar:</strong> heuristic client — không phản ánh chính xác tiến độ SFTP; tin cậy field <code>buildDemoProcessing</code> từ server.</li>
    </ol>
    <footer>Tài liệu đồng bộ với codebase YoMedia Dashboard · Nguồn: docs/chat-flow.md</footer>
  </section>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#dbeafe',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#f8fafc',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
      },
      flowchart: { htmlLabels: true, curve: 'basis', padding: 12 },
      sequence: { actorMargin: 40, messageMargin: 30 },
    });
  </script>
</body>
</html>`;

writeFileSync(outHtml, html, 'utf8');
console.log('Wrote', outHtml);

// Resolve puppeteer without mutating project node_modules (use: pnpm dlx -p puppeteer node …)
const repoRoot = join(docsDir, '..');
const require = createRequire(join(repoRoot, 'package.json'));
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  console.error(
    'puppeteer chưa có. Chạy:\n  pnpm dlx -p puppeteer node docs/scripts/generate-chat-flow-pdf.mjs'
  );
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.goto(`file:///${outHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 120000 });

  // Wait for all mermaid diagrams to render
  await page.waitForFunction(
    () => {
      const nodes = document.querySelectorAll('.mermaid');
      if (nodes.length === 0) return false;
      return [...nodes].every((n) => n.querySelector('svg'));
    },
    { timeout: 90000 }
  );
  await new Promise((r) => setTimeout(r, 1500));

  await page.pdf({
    path: outPdf,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  });

  console.log('Created', outPdf);
} finally {
  await browser.close();
}
