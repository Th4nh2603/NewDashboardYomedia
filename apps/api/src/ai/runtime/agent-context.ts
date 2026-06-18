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
  allowedMcpTools: string[];
  conversationId: string;
  message: string;
  pageContext?: DashboardPageContext;
}
