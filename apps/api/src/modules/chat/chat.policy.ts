import { permissions } from "../../shared/constants/permissions.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  AuthenticatedChatContext,
  ChatExecutionScope,
  ChatRequest,
} from "./chat.types.js";

function hasPermission(auth: AuthenticatedChatContext, permission: string): boolean {
  return auth.permissions.includes(permission);
}

export const chatPolicy = {
  assertCanUseChat(auth: AuthenticatedChatContext): void {
    if (!hasPermission(auth, permissions.chatUse)) {
      throw new AppError("You do not have permission to use chat.", 403);
    }
  },

  resolveTenantScope(auth: AuthenticatedChatContext): string {
    if (!auth.tenantId) {
      throw new AppError("Authenticated tenant scope is required.", 403);
    }

    return auth.tenantId;
  },

  resolveBrandScope(
    auth: AuthenticatedChatContext,
    input: ChatRequest,
  ): string | undefined {
    const pageContext =
      typeof input.pageContext === "object" && input.pageContext !== null
        ? (input.pageContext as Record<string, unknown>)
        : null;
    const selectedBrandId =
      typeof pageContext?.selectedBrandId === "string"
        ? pageContext.selectedBrandId
        : undefined;
    const brandHint = input.brandId ?? selectedBrandId;
    if (!brandHint) return undefined;

    if (!auth.allowedBrandIds.includes(brandHint)) {
      throw new AppError("Requested brand scope is not allowed.", 403);
    }

    return brandHint;
  },

  resolveKnowledgeBaseScope(
    auth: AuthenticatedChatContext,
    input: ChatRequest,
  ): string | undefined {
    if (!input.knowledgeBaseId) return undefined;

    if (!auth.allowedKnowledgeBaseIds.includes(input.knowledgeBaseId)) {
      throw new AppError("Requested knowledge base scope is not allowed.", 403);
    }

    return input.knowledgeBaseId;
  },

  buildExecutionScope(
    auth: AuthenticatedChatContext,
    input: ChatRequest,
  ): ChatExecutionScope {
    this.assertCanUseChat(auth);

    return {
      userId: auth.userId,
      tenantId: this.resolveTenantScope(auth),
      permissions: auth.permissions,
      allowedBrandIds: auth.allowedBrandIds,
      allowedKnowledgeBaseIds: auth.allowedKnowledgeBaseIds,
      allowedMcpTools: auth.allowedMcpTools,
      allowedToolCapabilities:
        auth.allowedToolCapabilities ?? auth.allowedMcpTools,
      allowedBuildDemoBrands: auth.allowedBuildDemoBrands,
      requestedBrandId: this.resolveBrandScope(auth, input),
      requestedKnowledgeBaseId: this.resolveKnowledgeBaseScope(auth, input),
    };
  },
};
