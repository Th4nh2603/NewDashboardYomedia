export interface AuthenticatedUser {
  id: string;
  clerkUserId: string;
  tenantId: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string;
  role: string;
  roleTitle: string;
  permissions: string[];
  allowedRoutes: string[];
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
  /** Legacy name retained for compatibility. MCP is not enabled in Agent Core. */
  allowedMcpTools: string[];
  allowedToolCapabilities?: string[];
  allowedBuildDemoBrands?: string[] | null;
}

export interface AuthSession {
  user: AuthenticatedUser | null;
}

export interface AuthMeResult {
  ok: true;
  nameMatched: boolean;
  isGuest: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    roleTitle: string;
    status: "active";
    allowedRoutes: string[];
    allowedBuildDemoBrands?: string[] | null;
  };
}
