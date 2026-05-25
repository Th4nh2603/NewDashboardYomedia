import { trpcClient } from "./client";
import { trpcErrorToBackend } from "./errors";

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw trpcErrorToBackend(err);
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
        allowedBuildDemoBrands?: unknown;
      },
    ) => call(() => trpcClient.admin.updateAccount.mutate({ id, ...patch })),
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
  testData: {
    get: () => call(() => trpcClient.testData.get.query()),
    update: (content: string | Record<string, unknown>) =>
      call(() => trpcClient.testData.update.mutate({ content })),
  },
  rag: {
    query: (question: string) =>
      call(() => trpcClient.rag.query.mutate({ question })),
  },
};
