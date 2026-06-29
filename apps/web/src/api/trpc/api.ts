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

type ProcedureClient = {
  query: (input?: unknown) => Promise<unknown>;
  mutate: (input?: unknown) => Promise<unknown>;
};

const looseTrpcClient = trpcClient as unknown as {
  [group: string]: Record<string, ProcedureClient>;
};

type RolePermissionConfig = Record<
  string,
  {
    manageDemo?: {
      canUseFileActionButtons?: boolean;
      canSwitchSftpHost?: boolean;
      canSetupMediaSftp?: boolean;
      canSftpUploadBinary?: boolean;
      canSftpWriteFile?: boolean;
      canSftpDelete?: boolean;
      canSftpRename?: boolean;
      canSftpMkdir?: boolean;
      allowedBuildDemoBrands?: string[];
    };
    routeAccess?: {
      allowedRoutes?: string[];
    };
    creativeShowcase?: {
      canDownload?: boolean;
    };
  }
>;

type PermissionsResponse = {
  permissions?: RolePermissionConfig;
  availableRoutes?: string[];
};

type AccountsResponse = {
  accounts?: unknown[];
};

type CreativeDemosResponse = {
  demos?: unknown[];
};

type CreativeDemoTitlesResponse = {
  items?: {
    id: string;
    title: string;
    category: string;
    fileType?: string;
    value?: string;
    size?: string | string[];
    fla?: boolean;
  }[];
};

type ActivityLogListResponse = {
  records?: unknown[];
  total?: number;
};

type ApprovalListResponse = {
  approvals?: unknown[];
};

type ApprovalMutationResponse = {
  approval?: unknown;
  toolCall?: unknown;
  result?: unknown;
};

type TestDataResponse = {
  ok?: boolean;
  content?: unknown;
};

type ToolOption = {
  value: string;
  label: string;
  [key: string]: unknown;
};

type ToolField = {
  key: string;
  label: string;
  type: "text" | "number" | "checkbox";
  value?: string;
  checked?: boolean;
  [key: string]: unknown;
};

type ToolOptionsResponse = {
  ok?: boolean;
  options: ToolOption[];
};

type ToolSettingsResponse = {
  ok?: boolean;
  fields: ToolField[];
};

type PlatformFormFieldOption = {
  value: string;
  label: string;
  selected?: boolean;
  width?: number;
  height?: number;
};

type PlatformFormField = {
  id: string;
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file" | "size";
  value?: string;
  placeholder?: string;
  maxlength?: number;
  checked?: boolean;
  width?: string;
  height?: string;
  options?: PlatformFormFieldOption[];
  optionTotal?: number;
};

type ToolPlatformBannerResponse = {
  ok?: boolean;
  page?: {
    url: string;
    fetchedAt: string;
    title: string;
    profileName: string | null;
    profileRole: string | null;
    grid: {
      page: number;
      total: number;
      records: number;
      rows: Record<string, unknown>[];
      columns: { name: string; label: string }[];
    };
    createForm: {
      url: string;
      title: string;
      formAction: string;
      fields: PlatformFormField[];
    };
  };
};

type ToolCreateBannerResponse = {
  ok?: boolean;
  message?: string;
  [key: string]: unknown;
};

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
  conversationId?: string;
  messageId?: string;
  answer?: string;
  intent?: string;
  agent?: string;
  sources?: unknown[];
  toolCalls?: unknown[];
  approvals?: unknown[];
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

function procedure(group: string, name: string): ProcedureClient {
  return looseTrpcClient[group][name];
}

function query<T>(group: string, name: string, input?: unknown): Promise<T> {
  return procedure(group, name).query(input) as Promise<T>;
}

function mutate<T>(group: string, name: string, input?: unknown): Promise<T> {
  return procedure(group, name).mutate(input) as Promise<T>;
}

export const api = {
  health: {
    check: () => call(() => query<{ ok?: boolean }>("health", "check")),
  },
  auth: {
    session: () => call(() => query<unknown>("auth", "session")),
    me: (input?: { name?: string }) => call(() => mutate<unknown>("auth", "me", input)),
    roleRoutes: (input?: { name?: string }) =>
      call(() => mutate<unknown>("auth", "roleRoutes", input)),
  },
  user: {
    me: () => call(() => query<unknown>("user", "me")),
  },
  permissions: {
    get: () => call(() => query<PermissionsResponse>("permissions", "get")),
    adminGet: () =>
      call(() => query<PermissionsResponse>("permissions", "adminGet")),
    adminUpdate: (role: string, payload: Record<string, unknown>) =>
      call(() =>
        mutate<unknown>("permissions", "adminUpdate", {
          role,
          payload,
        }),
      ),
  },
  admin: {
    accounts: () => call(() => query<AccountsResponse>("admin", "accounts")),
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
      return call(() => mutate<unknown>("admin", "updateAccount", input));
    },
  },
  creative: {
    demos: () => call(() => query<CreativeDemosResponse>("creative", "demos")),
    demoTitles: (activeOnly?: boolean) =>
      call(() =>
        query<CreativeDemoTitlesResponse>("creative", "demoTitles", {
          activeOnly,
        }),
      ),
  },
  activityLog: {
    list: (input?: {
      email?: string;
      special?: string;
      scope?: string;
      limit?: number;
    }) =>
      call(() => query<ActivityLogListResponse>("activityLog", "list", input)),
    append: (entry: Record<string, unknown>) =>
      call(() => mutate<unknown>("activityLog", "append", entry)),
    clear: () => call(() => mutate<unknown>("activityLog", "clear")),
  },
  approval: {
    listPending: (input?: { status?: string; limit?: number }) =>
      call(() => query<ApprovalListResponse>("approval", "listPending", input)),
    approve: (approvalId: string) =>
      call(() =>
        mutate<ApprovalMutationResponse>("approval", "approve", { approvalId }),
      ),
    reject: (approvalId: string) =>
      call(() =>
        mutate<ApprovalMutationResponse>("approval", "reject", { approvalId }),
      ),
    execute: (approvalId: string) =>
      call(() =>
        mutate<ApprovalMutationResponse>("approval", "execute", { approvalId }),
      ),
  },
  testData: {
    get: () => call(() => query<TestDataResponse>("testData", "get")),
    update: (content: string | Record<string, unknown>) =>
      call(() => mutate<TestDataResponse>("testData", "update", { content })),
  },
  toolTest: {
    platformBanner: () =>
      call(() => query<ToolPlatformBannerResponse>("toolTest", "platformBanner")),
    bannerAdUnits: (adView: string) =>
      call(() =>
        query<ToolOptionsResponse>("toolTest", "bannerAdUnits", {
          adView,
        }),
      ),
    bannerTemplates: (adView: string, market?: string) =>
      call(() =>
        query<ToolOptionsResponse>("toolTest", "bannerTemplates", {
          adView,
          market,
        }),
      ),
    bannerSettings: (formatId: string, type: string) =>
      call(() =>
        query<ToolSettingsResponse>("toolTest", "bannerSettings", {
          formatId,
          type,
        }),
      ),
    createBanner: (payload: Record<string, unknown>) =>
      call(() => mutate<ToolCreateBannerResponse>("toolTest", "createBanner", payload)),
    bannerAdvertisers: () =>
      call(() => query<ToolOptionsResponse>("toolTest", "bannerAdvertisers")),
  },
  chat: {
    sendMessage: (input: ChatSendMessageInput) =>
      call(() => mutate<ChatSendMessageResponse>("chat", "sendMessage", input)),
  },
};
