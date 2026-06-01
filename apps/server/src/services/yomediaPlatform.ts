import { Agent } from "undici";
import { HttpError } from "../lib/http/errors.js";

const DEFAULT_BASE = "https://platform.yomedia.vn";

/** Node fetch fails TLS verify for platform.yomedia.vn on some hosts; set to `0` to enforce verify. */
const platformTlsInsecure = process.env.YOMEDIA_PLATFORM_TLS_INSECURE !== "0";

const platformDispatcher = platformTlsInsecure
  ? new Agent({ connect: { rejectUnauthorized: false } })
  : undefined;

export type PlatformBannerColumn = {
  name: string;
  label: string;
};

export type PlatformBannerRow = Record<string, unknown>;

export type PlatformBannerGrid = {
  page: number;
  total: number;
  records: number;
  rows: PlatformBannerRow[];
  columns: PlatformBannerColumn[];
};

export type PlatformFormFieldOption = {
  value: string;
  label: string;
  selected?: boolean;
  width?: number;
  height?: number;
};

export type PlatformFormField = {
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

export type PlatformBannerCreateForm = {
  url: string;
  title: string;
  formAction: string;
  fields: PlatformFormField[];
};

export type PlatformBannerPage = {
  url: string;
  fetchedAt: string;
  title: string;
  profileName: string | null;
  profileRole: string | null;
  grid: PlatformBannerGrid;
  createForm: PlatformBannerCreateForm;
};

const MAX_SELECT_OPTIONS = 80;

function platformBaseUrl(): string {
  return (process.env.YOMEDIA_PLATFORM_BASE_URL || DEFAULT_BASE).replace(
    /\/+$/,
    "",
  );
}

function platformCredentials(): { log: string; password: string } {
  const log =
    process.env.YOMEDIA_PLATFORM_USERNAME?.trim() ||
    process.env.YOMEDIA_PLATFORM_LOG?.trim() ||
    "";
  const password = process.env.YOMEDIA_PLATFORM_PASSWORD?.trim() || "";
  if (!log || !password) {
    throw new HttpError(
      503,
      "Missing YOMEDIA_PLATFORM_USERNAME (or YOMEDIA_PLATFORM_LOG) and YOMEDIA_PLATFORM_PASSWORD in server .env",
      { code: "PLATFORM_CREDENTIALS_MISSING" },
    );
  }
  return { log, password };
}

class CookieJar {
  private readonly store = new Map<string, string>();

  ingest(headers: Headers): void {
    const cookies =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : [headers.get("set-cookie")].filter((c): c is string => Boolean(c));
    for (const raw of cookies) {
      const part = raw.split(/,(?=\s*[^;]+=)/)[0] ?? raw;
      const [pair] = part.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name) this.store.set(name, value);
    }
  }

  header(): string {
    return Array.from(this.store.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

function extractCsrfToken(html: string): string {
  const meta = html.match(
    /<meta\s+name="csrf-token"\s+content="([^"]+)"/i,
  )?.[1];
  if (meta) return meta;
  const hidden = html.match(
    /<input[^>]+name="_token"[^>]+value="([^"]+)"/i,
  )?.[1];
  if (hidden) return hidden;
  const hidden2 = html.match(
    /<input[^>]+value="([^"]+)"[^>]+name="_token"/i,
  )?.[1];
  if (hidden2) return hidden2;
  throw new HttpError(502, "Could not read CSRF token from platform login page", {
    code: "PLATFORM_CSRF_MISSING",
  });
}

function stripTags(fragment: string): string {
  return fragment
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseSelectOptions(
  selectHtml: string,
): { options: PlatformFormFieldOption[]; total: number } {
  const options: PlatformFormFieldOption[] = [];
  const re = /<option([^>]*)>([\s\S]*?)<\/option>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(selectHtml))) {
    const attrs = m[1];
    const label = stripTags(m[2]);
    const value =
      attrs.match(/\bvalue\s*=\s*"([^"]*)"/i)?.[1] ??
      attrs.match(/\bvalue\s*=\s*'([^']*)'/i)?.[1] ??
      "";
    if (!label && !value) continue;
    const selected = /\bselected\b/i.test(attrs);
    const width = attrs.match(/\bdata-width\s*=\s*"(\d+)"/i)?.[1];
    const height = attrs.match(/\bdata-height\s*=\s*"(\d+)"/i)?.[1];
    options.push({
      value,
      label: label || value,
      selected,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
    });
  }
  const total = options.length;
  return {
    options: options.slice(0, MAX_SELECT_OPTIONS),
    total,
  };
}

function fieldFromFormGroup(block: string, groupId: string): PlatformFormField | null {
  const label = stripTags(
    block.match(/<label[^>]*class="[^"]*control-label[^"]*"[^>]*>([\s\S]*?)<\/label>/i)?.[1] ||
      "",
  );
  if (!label) return null;

  const sizeMatch = groupId === "size";
  if (sizeMatch) {
    const width =
      block.match(/id="txtWidth"[^>]*value="([^"]*)"/i)?.[1] ?? "";
    const height =
      block.match(/id="txtHeight"[^>]*value="([^"]*)"/i)?.[1] ?? "";
    return {
      id: groupId,
      name: "size",
      label,
      type: "size",
      width,
      height,
    };
  }

  const selectMatch = block.match(/<select[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/i);
  if (selectMatch) {
    const name = selectMatch[1];
    const { options, total } = parseSelectOptions(selectMatch[2]);
    const selected = options.find((o) => o.selected);
    return {
      id: groupId,
      name,
      label,
      type: "select",
      value: selected?.value,
      options,
      optionTotal: total > MAX_SELECT_OPTIONS ? total : undefined,
    };
  }

  const textareaMatch = block.match(
    /<textarea[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/textarea>/i,
  );
  if (textareaMatch) {
    return {
      id: groupId,
      name: textareaMatch[1],
      label,
      type: "textarea",
      value: stripTags(textareaMatch[2]),
    };
  }

  const fileMatch = block.match(/<input[^>]*type="file"[^>]*id="([^"]*)"[^>]*>/i);
  if (fileMatch) {
    return {
      id: groupId,
      name: fileMatch[1] || "file",
      label,
      type: "file",
    };
  }

  const checkboxMatch = block.match(
    /<input[^>]*type="checkbox"[^>]*name="([^"]*)"[^>]*>/i,
  );
  if (checkboxMatch) {
    const checked = /\bchecked\b/i.test(checkboxMatch[0]);
    return {
      id: groupId,
      name: checkboxMatch[1],
      label,
      type: "checkbox",
      checked,
    };
  }

  const inputMatch = block.match(
    /<input[^>]*type="text"[^>]*name="([^"]*)"[^>]*>/i,
  );
  if (inputMatch) {
    const tag = inputMatch[0];
    const value = tag.match(/\bvalue="([^"]*)"/i)?.[1] ?? "";
    const placeholder = tag.match(/\bplaceholder="([^"]*)"/i)?.[1];
    const maxlength = tag.match(/\bmaxlength="(\d+)"/i)?.[1];
    return {
      id: groupId,
      name: inputMatch[1],
      label,
      type: "text",
      value,
      placeholder,
      maxlength: maxlength ? Number(maxlength) : undefined,
    };
  }

  return null;
}

function resolveFormGroupId(groupId: string, field: PlatformFormField): string {
  if (groupId === "type" && field.name === "ad_view") return "ad_view";
  if (groupId === "type" && field.name === "type") return "banner_type";
  return groupId || field.name;
}

function extractFormGroups(html: string): { id: string; block: string }[] {
  const openings = [
    ...html.matchAll(/<div\s+class="form-group[^"]*"[^>]*>/gi),
  ];
  const groups: { id: string; block: string }[] = [];
  for (let i = 0; i < openings.length; i++) {
    const openTag = openings[i][0];
    const start = (openings[i].index ?? 0) + openTag.length;
    const end =
      i + 1 < openings.length
        ? openings[i + 1].index ?? html.length
        : html.search(/<div\s+class="hr-line|<button\s+type="button"\s+id="btnSave"/i);
    const block = html.slice(start, end > start ? end : html.length);
    const id = openTag.match(/\bid="([^"]+)"/i)?.[1] ?? `group_${i}`;
    if (/has-error|removeClass/.test(block.slice(0, 40))) continue;
    if (/style="display:\s*none"/i.test(openTag)) continue;
    groups.push({ id, block });
  }
  return groups;
}

export function parseBannerCreateForm(html: string): PlatformBannerCreateForm {
  const title = stripTags(
    html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "Create a Banner",
  );
  const formAction =
    html.match(/<form[^>]*action="([^"]+)"/i)?.[1] ||
    `${platformBaseUrl()}/banner/store`;

  const fields: PlatformFormField[] = [];
  for (const { id, block } of extractFormGroups(html)) {
    const field = fieldFromFormGroup(block, id);
    if (!field) continue;
    field.id = resolveFormGroupId(id, field);
    if (field.name === "active") field.id = "active";
    fields.push(field);
  }

  return {
    url: `${platformBaseUrl()}/banner/create`,
    title,
    formAction,
    fields,
  };
}

export function parseJqGridColModel(html: string): PlatformBannerColumn[] {
  const columns: PlatformBannerColumn[] = [];
  const re = /\{label:\s*'([^']*)',\s*name:\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const label = m[1].trim();
    const name = m[2].trim();
    if (name === "action") continue;
    columns.push({ label, name });
  }
  return columns;
}

function normalizeGridRow(row: Record<string, unknown>): PlatformBannerRow {
  const next: PlatformBannerRow = { ...row };
  const size = row.size;
  if (size && typeof size === "object" && size !== null) {
    const w = (size as { width?: unknown }).width;
    const h = (size as { height?: unknown }).height;
    if (w != null && h != null) {
      next.size = `${w}x${h}`;
    }
  }
  if (typeof row.active === "boolean") {
    next.active = row.active ? "yes" : "no";
  }
  return next;
}

async function platformFetch(
  url: string,
  jar: CookieJar,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const cookie = jar.header();
  if (cookie) headers.set("cookie", cookie);
  if (!headers.has("user-agent")) {
    headers.set(
      "user-agent",
      "YoMedia-Dashboard/1.0 (platform banner sync; admin tool)",
    );
  }
  const res = await fetch(url, {
    ...init,
    headers,
    dispatcher: platformDispatcher,
  });
  jar.ingest(res.headers);
  return res;
}

async function loginPlatform(jar: CookieJar, base: string): Promise<string> {
  const { log, password } = platformCredentials();
  const loginUrl = `${base}/auth/login`;

  const loginPageRes = await platformFetch(loginUrl, jar);
  const loginHtml = await loginPageRes.text();
  const token = extractCsrfToken(loginHtml);

  const body = new URLSearchParams({
    _token: token,
    log,
    password,
    remember: "1",
  });

  await platformFetch(loginUrl, jar, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: loginUrl,
      origin: base,
    },
    body: body.toString(),
    redirect: "manual",
  });

  const shellRes = await platformFetch(`${base}/banner`, jar);
  const shellHtml = await shellRes.text();
  if (
    /loginscreen/i.test(shellHtml) ||
    /<form[^>]+name="login"/i.test(shellHtml)
  ) {
    throw new HttpError(
      401,
      "Platform login failed — check YOMEDIA_PLATFORM_USERNAME and YOMEDIA_PLATFORM_PASSWORD",
      { code: "PLATFORM_LOGIN_FAILED" },
    );
  }
  return extractCsrfToken(shellHtml);
}

async function fetchPlatformJsonHtml(
  jar: CookieJar,
  base: string,
  path: string,
  csrf: string,
  init?: RequestInit,
): Promise<string> {
  const res = await platformFetch(`${base}${path}`, jar, {
    ...init,
    headers: {
      "x-csrf-token": csrf,
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
      referer: `${base}/banner`,
      ...init?.headers,
    },
  });
  const text = await res.text();
  let parsed: { html?: string };
  try {
    parsed = JSON.parse(text) as { html?: string };
  } catch {
    throw new HttpError(502, `Platform ${path} did not return JSON`, {
      code: "PLATFORM_FRAGMENT_INVALID",
    });
  }
  if (!parsed.html) {
    throw new HttpError(502, `Platform ${path} missing html fragment`, {
      code: "PLATFORM_FRAGMENT_INVALID",
    });
  }
  return parsed.html;
}

async function fetchBannerCreateFragment(
  jar: CookieJar,
  base: string,
  csrf: string,
): Promise<string> {
  return fetchPlatformJsonHtml(jar, base, "/banner/create", csrf, {
    method: "GET",
  });
}

async function fetchBannerListFragment(
  jar: CookieJar,
  base: string,
  csrf: string,
): Promise<string> {
  return fetchPlatformJsonHtml(jar, base, "/banner/list", csrf, {
    method: "POST",
  });
}

async function fetchBannerGrid(
  jar: CookieJar,
  base: string,
  csrf: string,
  options?: { page?: number; rows?: number },
): Promise<PlatformBannerGrid> {
  const page = options?.page ?? 1;
  const rows = options?.rows ?? 50;

  const body = new URLSearchParams({
    _token: csrf,
    page: String(page),
    rows: String(rows),
    sidx: "created_at",
    sord: "desc",
    filter: "all",
    keyword: "",
    field: "",
    opsel: "",
  });

  const res = await platformFetch(`${base}/banner/list`, jar, {
    method: "POST",
    headers: {
      "x-csrf-token": csrf,
      "x-requested-with": "XMLHttpRequest",
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/javascript, */*; q=0.01",
      referer: `${base}/banner`,
    },
    body: body.toString(),
  });

  const text = await res.text();
  let json: {
    rows?: Record<string, unknown>[];
    page?: number;
    total?: number;
    records?: number;
    html?: string;
  };
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(502, "Platform banner grid returned invalid JSON", {
      code: "PLATFORM_GRID_INVALID",
    });
  }

  if (!Array.isArray(json.rows)) {
    throw new HttpError(502, "Platform banner grid missing rows array", {
      code: "PLATFORM_GRID_INVALID",
    });
  }

  return {
    page: Number(json.page ?? page),
    total: Number(json.total ?? 0),
    records: Number(json.records ?? json.rows.length),
    rows: json.rows.map((row) => normalizeGridRow(row)),
    columns: [],
  };
}

function parseProfile(shellHtml: string): {
  profileName: string | null;
  profileRole: string | null;
} {
  const profileName = stripTags(
    shellHtml.match(
      /<span class="block m-t-xs">\s*<strong[^>]*>([\s\S]*?)<\/strong>/i,
    )?.[1] || "",
  );
  const profileRole = stripTags(
    shellHtml.match(
      /<span class="text-muted text-xs block">\s*([\s\S]*?)\s*<b class="caret"/i,
    )?.[1] || "",
  );
  return {
    profileName: profileName || null,
    profileRole: profileRole || null,
  };
}

export async function fetchPlatformBannerPage(options?: {
  page?: number;
  rows?: number;
}): Promise<PlatformBannerPage> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  const csrf = await loginPlatform(jar, base);

  const shellRes = await platformFetch(`${base}/banner`, jar);
  const shellHtml = await shellRes.text();
  const title = stripTags(
    shellHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
  );
  const { profileName, profileRole } = parseProfile(shellHtml);

  const [listHtml, createHtml] = await Promise.all([
    fetchBannerListFragment(jar, base, csrf),
    fetchBannerCreateFragment(jar, base, csrf),
  ]);
  const createForm = parseBannerCreateForm(createHtml);
  const columns = parseJqGridColModel(listHtml);
  const grid = await fetchBannerGrid(jar, base, csrf, options);
  grid.columns =
    columns.length > 0
      ? columns
      : [
          { name: "num_id", label: "ID" },
          { name: "banner_name", label: "Banner name" },
          { name: "account_name", label: "Advertiser" },
          { name: "ad_format", label: "Format" },
          { name: "active", label: "Active" },
          { name: "updated_at", label: "Last Updated" },
        ];

  return {
    url: `${base}/banner`,
    fetchedAt: new Date().toISOString(),
    title,
    profileName,
    profileRole,
    grid,
    createForm,
  };
}
