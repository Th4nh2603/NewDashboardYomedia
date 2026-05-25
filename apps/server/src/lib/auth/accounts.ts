import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const accountsPath = path.join(__dirname, "..", "..", "data", "accounts.json");

export type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  roleTitle?: string;
  status?: string;
  allowedBuildDemoBrands?: string[] | null;
};

let accountsCache: Account[] | null = null;

export function normalizeAccountText(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** Renamed slug: `adsopmanager` → `manager` (backward compat). */
export function migrateLegacyRoleKey(roleRaw: string | undefined): string {
  const r = normalizeAccountText(roleRaw);
  if (!r) return "guest";
  return r === "adsopmanager" ? "manager" : r;
}

export function loadAccounts(): Account[] {
  if (!accountsCache) {
    const raw = fs.readFileSync(accountsPath, "utf8");
    const parsed = JSON.parse(raw) as { accounts: Account[] };
    accountsCache = parsed.accounts || [];
  }
  return accountsCache;
}

export function saveAccounts(accounts: Account[]): void {
  accountsCache = accounts;
  fs.writeFileSync(accountsPath, JSON.stringify({ accounts }, null, 2), "utf8");
}

export function findAccountById(id: string): Account | undefined {
  const key = String(id || "").trim();
  if (!key) return undefined;
  return loadAccounts().find((account) => account.id === key);
}

export function findAccountByEmail(email: string): Account | undefined {
  const key = normalizeAccountText(email);
  if (!key) return undefined;
  return loadAccounts().find(
    (account) => normalizeAccountText(account.email) === key,
  );
}

export function resolveRoleForClerkUserId(clerkUserId: string): string {
  const account = findAccountById(clerkUserId);
  if (account?.role) {
    return migrateLegacyRoleKey(account.role);
  }
  return "guest";
}
