export interface DashboardPageContext {
  route: string;
  title?: string;
  selectedBrandId?: string;
  filters?: Record<string, unknown>;
}

export interface AgentContext {
  userId: string;
  tenantId: string;
  permissions: string[];
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
  /** Legacy name retained for compatibility. MCP is not enabled in Agent Core. */
  allowedMcpTools: string[];
  allowedToolCapabilities?: string[];
  allowedBuildDemoBrands?: string[] | null;
  conversationId: string;
  requestId?: string;
  message: string;
  requestedBrandId?: string;
  requestedKnowledgeBaseId?: string;
  pageContext?: unknown;
  provider?: "gemini" | "openai";
  attachments?: {
    name: string;
    relativePath?: string;
    size: number;
    mimeType?: string;
  }[];
}
