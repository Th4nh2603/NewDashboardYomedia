function parseRoleSet(envKey: string, defaultValue: string): Set<string> {
  const raw = process.env[envKey]?.trim() || defaultValue;
  return new Set(
    raw
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function sqlAllowedRoles(): Set<string> {
  return parseRoleSet("AI_SQL_ALLOWED_ROLES", "admin,manager");
}

export function dashboardAllowedRoles(): Set<string> {
  return parseRoleSet(
    "AI_DASHBOARD_ALLOWED_ROLES",
    "admin,manager,media,design,user",
  );
}

export function isRoleAllowed(
  role: string,
  allowed: Set<string>,
): boolean {
  return allowed.has(String(role || "").trim().toLowerCase());
}
