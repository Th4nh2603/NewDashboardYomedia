export type ChatProvider = "gemini" | "openai";

export type Intent =
  | "knowledge_qa"
  | "free_chat"
  | "actions"
  | "sql_query"
  | "dashboard_insight"
  | "multi_intent";

export type AgentName =
  | "rag"
  | "actions"
  | "free_chat"
  | "sql"
  | "dashboard"
  | "search";

export type MemoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatAttachmentMeta = {
  name: string;
  relativePath?: string;
  size: number;
  mimeType?: string;
  contentBase64?: string;
  encoding?: "base64";
};

export type PlacementCodesDownloadHint = {
  websiteName: string;
  variant: "standard" | "rtb";
  matchedCount: number;
  zipName: string;
};

export type ActionToolName =
  | "time_now"
  | "help"
  | "upload_sftp_demo"
  | "compress_demo_assets"
  | "download_placement_codes";

export type RagAnswerResult = {
  ok: true;
  answer: string;
  provider: ChatProvider;
  intent: Intent;
  sources: string[];
  fallbackUsed: boolean;
  toolCalled?: ActionToolName;
  /** True while server executed Build Demo (upload) on this request. */
  buildDemoProcessing?: boolean;
  /** Client should fetch ZIP via REST when present. */
  placementCodesDownload?: PlacementCodesDownloadHint;
};

export type RouteDecision = {
  intent: Intent;
  agent: AgentName;
  agents: AgentName[];
  confidence: number;
  reason: string;
  source: "rule_tool" | "llm" | "rule_fallback" | "rule_multi";
};

export type AgentTraceSpan = {
  agent: AgentName;
  startedAt: number;
  endedAt: number;
  ok: boolean;
  confidence?: number;
  reason?: string;
  toolCalled?: string;
  sources?: string[];
  error?: string;
};

export type AgentContext = {
  requestId: string;
  question: string;
  provider: ChatProvider;
  role: string;
  email?: string;
  sessionId?: string;
  memoryKey: string;
  history: MemoryMessage[];
  attachments: ChatAttachmentMeta[];
  /** Express request for controller-level auth policy (build demo SFTP ACL). */
  req?: import("express").Request;
};

export type AgentResult = {
  ok: boolean;
  agent: AgentName;
  answer: string;
  confidence: number;
  sources: string[];
  toolCalled?: ActionToolName;
  buildDemoProcessing?: boolean;
  placementCodesDownload?: PlacementCodesDownloadHint;
  fallbackUsed?: boolean;
  spans: AgentTraceSpan[];
  metadata?: Record<string, unknown>;
};

export type SupervisorResult = {
  ok: true;
  answer: string;
  provider: ChatProvider;
  intent: Intent;
  agent: AgentName;
  sources: string[];
  fallbackUsed: boolean;
  toolCalled?: ActionToolName;
  buildDemoProcessing?: boolean;
  placementCodesDownload?: PlacementCodesDownloadHint;
  trace: {
    requestId: string;
    route: RouteDecision;
    spans: AgentTraceSpan[];
    totalMs: number;
  };
};
