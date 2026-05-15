import { serverApiOrigin } from "./serverApiOrigin";

export type ActivityLogEntry = {
  id: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  area: string;
  description: string;
  target: string;
  metadata?: Record<string, unknown>;
};

type ActivityActor = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type RecordActivityInput = {
  user?: ActivityActor | null;
  action: string;
  area: string;
  description: string;
  target?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export async function recordActivity({
  user,
  action,
  area,
  description,
  target = "",
  metadata,
  createdAt,
}: RecordActivityInput): Promise<void> {
  const userName = normalizeText(user?.name);
  const userEmail = normalizeText(user?.email);
  const userRole = normalizeText(user?.role);

  if (!userName && !userEmail) return;

  try {
    const res = await fetch(`${serverApiOrigin()}/api/activity-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName,
        userEmail,
        userRole,
        action,
        area,
        description,
        target,
        metadata,
        createdAt,
      }),
    });
    // Wait for body so the server has finished handling before callers refetch logs.
    await res.text().catch(() => undefined);
  } catch {
    // Best-effort logging; UI flows should not fail if activity capture fails.
  }
}
