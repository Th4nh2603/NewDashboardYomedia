import { isBackendRequestError } from "../apiError";
import {
  isApiConnectivityFailure,
  reportApiConnectivityFailure,
} from "../adminOfflineMode";
import { trpcClient } from "./client";
import { trpcErrorToBackend } from "./errors";
import {
  ACCOUNT_ROLES,
  type AccountRole,
  type AccountStatus,
} from "../form/schemas/adminAccount";

type ChatAttachmentMeta = {
  name: string;
  relativePath?: string;
  size: number;
  mimeType?: string;
  contentBase64?: string;
  encoding?: "base64";
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
    check: () => call(() => trpcClient.health.check.query()),
  },
  auth: {
    me: (input?: { name?: string }) =>
      call(() => trpcClient.auth.me.mutate(input)),
    roleRoutes: (input?: { name?: string }) =>
      call(() => trpcClient.auth.roleRoutes.mutate(input)),
  },
  user: {
    me: () => call(() => trpcClient.user.me.query()),
  },
  permissions: {
    get: () => call(() => trpcClient.permissions.get.query()),
    adminGet: () => call(() => trpcClient.permissions.adminGet.query()),
    adminUpdate: (role: string, payload: Record<string, unknown>) =>
      call(() =>
        trpcClient.permissions.adminUpdate.mutate({
          role,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: payload as any,
        }),
      ),
  },
  admin: {
    accounts: () => call(() => trpcClient.admin.accounts.query()),
    updateAccount: (
      id: string,
      patch: {
        role?: string;
        roleTitle?: string;
        status?: string;
        allowedBuildDemoBrands?: string[] | null;
      },
    ) => {
      const input: Parameters<typeof trpcClient.admin.updateAccount.mutate>[0] =
        { id: String(id).trim() };
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
      return call(() => trpcClient.admin.updateAccount.mutate(input));
    },
  },
  creative: {
    demos: () => call(() => trpcClient.creative.demos.query()),
    demoTitles: (activeOnly?: boolean) =>
      call(() => trpcClient.creative.demoTitles.query({ activeOnly })),
  },
  activityLog: {
    list: (input?: {
      email?: string;
      special?: string;
      scope?: string;
      limit?: number;
    }) => call(() => trpcClient.activityLog.list.query(input)),
    append: (entry: Record<string, unknown>) =>
      call(() =>
        trpcClient.activityLog.append.mutate(
          entry as Parameters<typeof trpcClient.activityLog.append.mutate>[0],
        ),
      ),
    clear: () => call(() => trpcClient.activityLog.clear.mutate()),
  },
  platformPages: {
    module: (
      module: "banner" | "flight" | "placement" | "campaign" | "report",
    ) => call(() => trpcClient.platformPages.module.query({ module })),
  },
  testData: {
    get: () => call(() => trpcClient.testData.get.query()),
    update: (content: string | Record<string, unknown>) =>
      call(() => trpcClient.testData.update.mutate({ content })),
    platform: () => call(() => trpcClient.testData.platform.query()),
    platformFile: () => call(() => trpcClient.testData.platformFile.query()),
    placementCode: (placementId: string, variant?: "standard" | "rtb") =>
      call(() =>
        trpcClient.testData.placementCode.query({ placementId, variant }),
      ),
  },
  toolTest: {
    platformBanner: () => call(() => trpcClient.toolTest.platformBanner.query()),
    bannerAdUnits: (adView: string) =>
      call(() => trpcClient.toolTest.bannerAdUnits.query({ adView })),
    bannerTemplates: (adView: string, market?: string) =>
      call(() =>
        trpcClient.toolTest.bannerTemplates.query({ adView, market }),
      ),
    bannerSettings: (formatId: string, type: string) =>
      call(() =>
        trpcClient.toolTest.bannerSettings.query({ formatId, type }),
      ),
    createBanner: (payload: Record<string, unknown>) =>
      call(() => trpcClient.toolTest.createBanner.mutate(payload)),
    bannerAdvertisers: () =>
      call(() => trpcClient.toolTest.bannerAdvertisers.query()),
  },
  rag: {
    query: (
      question: string,
      provider?: "gemini" | "openai",
      attachments?: ChatAttachmentMeta[],
      sessionId?: string,
    ) =>
      call(() =>
        trpcClient.rag.query.mutate({
          question,
          provider,
          attachments,
          sessionId,
        }),
      ),
    clearSession: (input?: { sessionId?: string; allSessions?: boolean }) =>
      call(() => trpcClient.rag.clearSession.mutate(input ?? {})),
  },
};
