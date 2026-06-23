import { isBackendRequestError } from "@/api/apiError";
import {
  isApiConnectivityFailure,
  reportApiConnectivityFailure,
} from "@/utils/adminOfflineMode";
import { trpcClient } from "./client";
import { trpcErrorToBackend } from "./errors";
import {
  ACCOUNT_ROLES,
  type AccountRole,
  type AccountStatus,
} from "@/utils/form/schemas/adminAccount";

const looseTrpcClient = trpcClient as any;

type ChatAttachmentMeta = {
  name: string;
  relativePath?: string;
  size: number;
  mimeType?: string;
};

type ChatSendMessageInput = {
  message: string;
  conversationId?: string;
  pageContext?: unknown;
  attachments?: ChatAttachmentMeta[];
  provider?: "gemini" | "openai";
};

type ChatSendMessageResponse = {
  conversationId: string;
  messageId: string;
  answer: string;
  intent?: string;
  agent?: string;
  sources?: unknown[];
  toolCalls?: unknown[];
  steps?: unknown[];
  data?: unknown;
  action?: {
    tool: string;
    [key: string]: unknown;
  };
  insufficientContext?: boolean;
};

function normalizeApiRole(role: string): AccountRole {
  const normalized = role.trim().toLowerCase();
  const migrated = normalized === "adsopmanager" ? "manager" : normalized;
  return ACCOUNT_ROLES.includes(migrated as AccountRole)
    ? (migrated as AccountRole)
    : "guest";
}

function normalizeApiStatus(status: string): AccountStatus {
  return status.trim().toLowerCase() === "inactive" ? "inactive" : "active";
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const backend = trpcErrorToBackend(err);
    if (
      isBackendRequestError(backend) &&
      isApiConnectivityFailure(backend.status, backend.code)
    ) {
      reportApiConnectivityFailure();
    }
    throw backend;
  }
}

export const api = {
  health: {
    check: () => call(() => looseTrpcClient.health.check.query()),
  },
  auth: {
    session: () => call(() => looseTrpcClient.auth.session.query()),
    me: (input?: { name?: string }) =>
      call(() => looseTrpcClient.auth.me.mutate(input)),
    roleRoutes: (input?: { name?: string }) =>
      call(() => looseTrpcClient.auth.roleRoutes.mutate(input)),
  },
  user: {
    me: () => call(() => looseTrpcClient.user.me.query()),
  },
  permissions: {
    get: () => call(() => looseTrpcClient.permissions.get.query()),
    adminGet: () => call(() => looseTrpcClient.permissions.adminGet.query()),
    adminUpdate: (role: string, payload: Record<string, unknown>) =>
      call(() =>
        looseTrpcClient.permissions.adminUpdate.mutate({
          role,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: payload as any,
        }),
      ),
  },
  admin: {
    accounts: () => call(() => looseTrpcClient.admin.accounts.query()),
    updateAccount: (
      id: string,
      patch: {
        role?: string;
        roleTitle?: string;
        status?: string;
        allowedBuildDemoBrands?: string[] | null;
      },
    ) => {
      const input: {
        id: string;
        role?: AccountRole;
        roleTitle?: string;
        status?: AccountStatus;
        allowedBuildDemoBrands?: string[] | null;
      } = { id: String(id).trim() };
      if (typeof patch.role === "string") {
        input.role = normalizeApiRole(patch.role);
      }
      if (typeof patch.roleTitle === "string") {
        input.roleTitle = patch.roleTitle.trim();
      }
      if (typeof patch.status === "string") {
        input.status = normalizeApiStatus(patch.status);
      }
      if (patch.allowedBuildDemoBrands !== undefined) {
        input.allowedBuildDemoBrands = patch.allowedBuildDemoBrands;
      }
      if (Object.keys(input).length === 1) {
        return Promise.reject(
          new Error("At least one field to update is required"),
        );
      }
      return call(() => looseTrpcClient.admin.updateAccount.mutate(input));
    },
  },
  creative: {
    demos: () => call(() => looseTrpcClient.creative.demos.query()),
    demoTitles: (activeOnly?: boolean) =>
      call(() => looseTrpcClient.creative.demoTitles.query({ activeOnly })),
  },
  activityLog: {
    list: (input?: {
      email?: string;
      special?: string;
      scope?: string;
      limit?: number;
    }) => call(() => looseTrpcClient.activityLog.list.query(input)),
    append: (entry: Record<string, unknown>) =>
      call(() =>
        looseTrpcClient.activityLog.append.mutate(
          entry as Parameters<typeof looseTrpcClient.activityLog.append.mutate>[0],
        ),
      ),
    clear: () => call(() => looseTrpcClient.activityLog.clear.mutate()),
  },
  testData: {
    get: () => call(() => looseTrpcClient.testData.get.query()),
    update: (content: string | Record<string, unknown>) =>
      call(() => looseTrpcClient.testData.update.mutate({ content })),
  },
  toolTest: {
    platformBanner: () => call(() => looseTrpcClient.toolTest.platformBanner.query()),
    bannerAdUnits: (adView: string) =>
      call(() => looseTrpcClient.toolTest.bannerAdUnits.query({ adView })),
    bannerTemplates: (adView: string, market?: string) =>
      call(() =>
        looseTrpcClient.toolTest.bannerTemplates.query({ adView, market }),
      ),
    bannerSettings: (formatId: string, type: string) =>
      call(() =>
        looseTrpcClient.toolTest.bannerSettings.query({ formatId, type }),
      ),
    createBanner: (payload: Record<string, unknown>) =>
      call(() => looseTrpcClient.toolTest.createBanner.mutate(payload)),
    bannerAdvertisers: () =>
      call(() => looseTrpcClient.toolTest.bannerAdvertisers.query()),
  },
  chat: {
    sendMessage: (input: ChatSendMessageInput) =>
      call<ChatSendMessageResponse>(() =>
        looseTrpcClient.chat.sendMessage.mutate(input),
      ),
  },
};
