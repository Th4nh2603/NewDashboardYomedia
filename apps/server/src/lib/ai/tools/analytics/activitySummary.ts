import { listActivityLogs, type ActivityLogEntry } from "../../../../services/activity/activityLog.js";

export type DashboardSummary = {
  totalRecords: number;
  windowSize: number;
  byArea: Array<{ area: string; count: number }>;
  byAction: Array<{ action: string; count: number }>;
  recentBuildDemos: ActivityLogEntry[];
  recentChatQueries: number;
  topUsers: Array<{ email: string; count: number }>;
};

function countByField(
  records: ActivityLogEntry[],
  field: "area" | "action",
  limit = 8,
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const record of records) {
    const key = String(record[field] || "unknown").trim() || "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function summarizeActivityDashboard(input: {
  role: string;
  email?: string;
  limit?: number;
}): Promise<DashboardSummary> {
  const limit = input.limit ?? 200;
  const result = await listActivityLogs({
    role: input.role,
    email: input.email,
    limit,
  });
  const records = result.records;

  const byArea = countByField(records, "area").map(({ key, count }) => ({
    area: key,
    count,
  }));
  const byAction = countByField(records, "action").map(({ key, count }) => ({
    action: key,
    count,
  }));

  const userCounts = new Map<string, number>();
  for (const record of records) {
    const email = String(record.userEmail || "").trim().toLowerCase();
    if (!email) continue;
    userCounts.set(email, (userCounts.get(email) ?? 0) + 1);
  }
  const topUsers = [...userCounts.entries()]
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentBuildDemos = records
    .filter(
      (r) =>
        r.area === "Build Demo" ||
        r.action.includes("upload_demo") ||
        r.action.includes("build_demo"),
    )
    .slice(0, 5);

  const recentChatQueries = records.filter(
    (r) => r.area === "Chat" && r.action === "chat_query",
  ).length;

  return {
    totalRecords: result.total,
    windowSize: records.length,
    byArea,
    byAction,
    recentBuildDemos,
    recentChatQueries,
    topUsers,
  };
}

export function formatDashboardSummary(summary: DashboardSummary): string {
  const lines = [
    `Tổng bản ghi khả dụng: ${summary.totalRecords} (phân tích ${summary.windowSize} bản ghi gần nhất).`,
    "",
    "Theo khu vực (area):",
    ...summary.byArea.map((x) => `- ${x.area}: ${x.count}`),
    "",
    "Theo hành động (action):",
    ...summary.byAction.map((x) => `- ${x.action}: ${x.count}`),
    "",
    `Chat queries gần đây: ${summary.recentChatQueries}`,
  ];

  if (summary.topUsers.length) {
    lines.push("", "Top user hoạt động:");
    for (const user of summary.topUsers) {
      lines.push(`- ${user.email}: ${user.count}`);
    }
  }

  if (summary.recentBuildDemos.length) {
    lines.push("", "Build Demo / upload gần đây:");
    for (const item of summary.recentBuildDemos) {
      lines.push(
        `- ${item.createdAt} | ${item.userEmail} | ${item.action} | ${item.description}`,
      );
    }
  }

  return lines.join("\n");
}
