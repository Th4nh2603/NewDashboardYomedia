import {
  loadAccounts,
  normalizeAccountText,
} from "../lib/accounts.js";
import { buildGuestPayload, buildUserPayload } from "./permissions.js";

const normalizeText = normalizeAccountText;

export function loginWithEmailPassword(email: string, password: string) {
  const accounts = loadAccounts();
  const normalizePhone = (value: string | undefined) =>
    (value || "").replace(/\s+/g, "");

  const account = accounts.find(
    (a) =>
      normalizeText(a.email) === normalizeText(email) &&
      normalizePhone(a.phone) === normalizePhone(password),
  );

  if (!account) {
    return { ok: false as const, error: "Invalid email or password" };
  }

  return { ok: true as const, user: buildUserPayload(account) };
}

export function resolveSessionUser(email: string, name?: string) {
  const emailNorm = normalizeText(email);
  const nameNorm = normalizeText(name);

  if (!emailNorm) {
    return {
      ok: false as const,
      error: "Missing email on verified session",
    };
  }

  const account = loadAccounts().find(
    (item) => normalizeText(item.email) === emailNorm,
  );

  if (!account) {
    return {
      ok: true as const,
      nameMatched: false,
      user: buildGuestPayload(emailNorm, name),
      isGuest: true as const,
    };
  }

  const nameMatched = !nameNorm || normalizeText(account.name) === nameNorm;

  return {
    ok: true as const,
    nameMatched,
    user: buildUserPayload(account),
    isGuest: false as const,
  };
}

export function getAccountProfile(email: string) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return { ok: false as const, error: "Missing email" };
  }

  const account = loadAccounts().find(
    (item) =>
      String(item.email || "")
        .trim()
        .toLowerCase() === normalized,
  );

  if (!account) {
    return { ok: false as const, error: "Account not found" };
  }

  return {
    ok: true as const,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      roleTitle: account.roleTitle,
      status: account.status,
    },
  };
}
