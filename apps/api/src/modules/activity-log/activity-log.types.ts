export interface ActivityLogEntry {
  id: string;
  createdAt: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  area: string;
  description: string;
  target: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogListResult {
  records: ActivityLogPublicEntry[];
  total: number;
}

export type ActivityLogPublicEntry = Omit<ActivityLogEntry, "tenantId" | "userId">;
