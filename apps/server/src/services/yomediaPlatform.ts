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

/** JSON export: all `<select>` options from /banner/create (no UI cap). */
export type PlatformBannerCreateOptionsJson = {
  fetchedAt: string;
  sourceUrl: string;
  title: string;
  formAction: string;
  selects: Array<{
    id: string;
    name: string;
    label: string;
    value?: string;
    optionCount: number;
    options: PlatformFormFieldOption[];
  }>;
  /** Ad Unit options per Ad View (`GET /banner/listAdUnits/{ad_view}`). */
  adUnitsByAdView: Record<
    string,
    {
      sourceUrl: string;
      optionCount: number;
      options: PlatformFormFieldOption[];
    }
  >;
  /** Template options per Ad View (`GET /banner/listFormats/{market}?env={ad_view}`). */
  templatesByAdView: Record<
    string,
    {
      market: string;
      sourceUrl: string;
      optionCount: number;
      options: PlatformFormFieldOption[];
    }
  >;
};

export type PlatformAdUnitOptionsForAdView = {
  fetchedAt: string;
  adView: string;
  sourceUrl: string;
  optionCount: number;
  options: PlatformFormFieldOption[];
};

export type PlatformTemplateOptionsForAdView = {
  fetchedAt: string;
  adView: string;
  market: string;
  sourceUrl: string;
  optionCount: number;
  options: PlatformFormFieldOption[];
};

export type PlatformBannerSettingField = {
  key: string;
  label: string;
  type: "text" | "number" | "checkbox";
  value?: string;
  checked?: boolean;
};

export type PlatformBannerSettingsFragment = {
  formatId: string;
  type: string;
  sourceUrl: string;
  fields: PlatformBannerSettingField[];
};

export type BannerCreateSubmitInput = {
  banner_name: string;
  advertiser: string;
  market: string;
  landing_page: string;
  ad_view: string;
  adunit: string;
  type: string;
  template?: string;
  use_tag: string;
  code_tag: string;
  notes: string;
  width: string;
  height: string;
  active: number;
  source: string;
  banner_settings: Record<string, string | number>;
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
  maxOptions = MAX_SELECT_OPTIONS,
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
  const limit =
    maxOptions <= 0 || !Number.isFinite(maxOptions)
      ? total
      : Math.min(maxOptions, total);
  return {
    options: options.slice(0, limit),
    total,
  };
}

function parseOptionsFromSelectHtml(
  html: string,
  maxOptions = MAX_SELECT_OPTIONS,
): PlatformFormFieldOption[] {
  const inner = html.match(/<select[^>]*>([\s\S]*?)<\/select>/i)?.[1] ?? html;
  return parseSelectOptions(inner, maxOptions).options;
}

function fieldFromFormGroup(
  block: string,
  groupId: string,
  maxSelectOptions = MAX_SELECT_OPTIONS,
): PlatformFormField | null {
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
    const { options, total } = parseSelectOptions(
      selectMatch[2],
      maxSelectOptions,
    );
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

export function parseBannerCreateForm(
  html: string,
  options?: { maxSelectOptions?: number },
): PlatformBannerCreateForm {
  const maxSelectOptions = options?.maxSelectOptions ?? MAX_SELECT_OPTIONS;
  const title = stripTags(
    html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "Create a Banner",
  );
  const formAction =
    html.match(/<form[^>]*action="([^"]+)"/i)?.[1] ||
    `${platformBaseUrl()}/banner/store`;

  const fields: PlatformFormField[] = [];
  for (const { id, block } of extractFormGroups(html)) {
    const field = fieldFromFormGroup(block, id, maxSelectOptions);
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

async function fetchBannerListAdUnitsHtml(
  jar: CookieJar,
  base: string,
  adView: string,
): Promise<string> {
  const res = await platformFetch(
    `${base}/banner/listAdUnits/${encodeURIComponent(adView)}`,
    jar,
    {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json, text/html, */*",
        referer: `${base}/banner`,
      },
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new HttpError(502, `Platform listAdUnits/${adView} returned ${res.status}`, {
      code: "PLATFORM_LIST_ADUNITS_FAILED",
    });
  }
  try {
    const parsed = JSON.parse(text) as { html?: string };
    if (parsed.html) return parsed.html;
  } catch {
    /* raw HTML fragment */
  }
  return text;
}

/** Ad Unit `<option>` list for a given Ad View (platform: `GET /banner/listAdUnits/{ad_view}`). */
export async function fetchAdUnitOptionsForAdView(
  adView: string,
): Promise<PlatformAdUnitOptionsForAdView> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  await loginPlatform(jar, base);
  const html = await fetchBannerListAdUnitsHtml(jar, base, adView);
  const options = parseOptionsFromSelectHtml(html, Number.MAX_SAFE_INTEGER);
  const path = `/banner/listAdUnits/${encodeURIComponent(adView)}`;

  return {
    fetchedAt: new Date().toISOString(),
    adView,
    sourceUrl: `${base}${path}`,
    optionCount: options.length,
    options,
  };
}

const AD_VIEW_VALUES = ["display", "mobile", "application", "video"] as const;
const DEFAULT_BANNER_MARKET = "vn";

async function fetchBannerListFormatsHtml(
  jar: CookieJar,
  base: string,
  market: string,
  adView: string,
): Promise<string> {
  const path = `/banner/listFormats/${encodeURIComponent(market)}?env=${encodeURIComponent(adView)}`;
  const res = await platformFetch(`${base}${path}`, jar, {
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json, text/html, */*",
      referer: `${base}/banner`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new HttpError(502, `Platform listFormats returned ${res.status}`, {
      code: "PLATFORM_LIST_FORMATS_FAILED",
    });
  }
  try {
    const parsed = JSON.parse(text) as { html?: string };
    if (parsed.html) return parsed.html;
  } catch {
    /* raw HTML fragment */
  }
  return text;
}

/** Template `<option>` list for Ad View + market (`GET /banner/listFormats/{market}?env={ad_view}`). */
export async function fetchTemplateOptionsForAdView(
  adView: string,
  market = DEFAULT_BANNER_MARKET,
): Promise<PlatformTemplateOptionsForAdView> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  await loginPlatform(jar, base);
  const html = await fetchBannerListFormatsHtml(jar, base, market, adView);
  const options = parseOptionsFromSelectHtml(html, Number.MAX_SAFE_INTEGER);
  const path = `/banner/listFormats/${encodeURIComponent(market)}?env=${encodeURIComponent(adView)}`;

  return {
    fetchedAt: new Date().toISOString(),
    adView,
    market,
    sourceUrl: `${base}${path}`,
    optionCount: options.length,
    options,
  };
}

async function fetchAllAdUnitsByAdView(
  jar: CookieJar,
  base: string,
): Promise<PlatformBannerCreateOptionsJson["adUnitsByAdView"]> {
  const out: PlatformBannerCreateOptionsJson["adUnitsByAdView"] = {};
  for (const adView of AD_VIEW_VALUES) {
    const html = await fetchBannerListAdUnitsHtml(jar, base, adView);
    const options = parseOptionsFromSelectHtml(html, Number.MAX_SAFE_INTEGER);
    const path = `/banner/listAdUnits/${encodeURIComponent(adView)}`;
    out[adView] = {
      sourceUrl: `${base}${path}`,
      optionCount: options.length,
      options,
    };
  }
  return out;
}

async function fetchAllTemplatesByAdView(
  jar: CookieJar,
  base: string,
  market = DEFAULT_BANNER_MARKET,
): Promise<PlatformBannerCreateOptionsJson["templatesByAdView"]> {
  const out: PlatformBannerCreateOptionsJson["templatesByAdView"] = {};
  for (const adView of AD_VIEW_VALUES) {
    const html = await fetchBannerListFormatsHtml(jar, base, market, adView);
    const options = parseOptionsFromSelectHtml(html, Number.MAX_SAFE_INTEGER);
    const path = `/banner/listFormats/${encodeURIComponent(market)}?env=${encodeURIComponent(adView)}`;
    out[adView] = {
      market,
      sourceUrl: `${base}${path}`,
      optionCount: options.length,
      options,
    };
  }
  return out;
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

/** Fetch /banner/create and return every select option (for JSON export). */
export async function fetchBannerCreateFormOptions(): Promise<PlatformBannerCreateOptionsJson> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  const csrf = await loginPlatform(jar, base);
  const createHtml = await fetchBannerCreateFragment(jar, base, csrf);
  const form = parseBannerCreateForm(createHtml, {
    maxSelectOptions: Number.MAX_SAFE_INTEGER,
  });
  const [adUnitsByAdView, templatesByAdView] = await Promise.all([
    fetchAllAdUnitsByAdView(jar, base),
    fetchAllTemplatesByAdView(jar, base),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: `${base}/banner/create`,
    title: form.title,
    formAction: form.formAction,
    selects: form.fields
      .filter((f) => f.type === "select")
      .map((f) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        value: f.value,
        optionCount: f.options?.length ?? 0,
        options: f.options ?? [],
      })),
    adUnitsByAdView,
    templatesByAdView,
  };
}

/** Parse `#settings` HTML fragment (`id="setting_*"`). */
export function parseBannerSettingsFields(html: string): PlatformBannerSettingField[] {
  const fields: PlatformBannerSettingField[] = [];
  const seen = new Set<string>();

  const knownCheckboxKeys = new Set(["close_button", "logo"]);
  const inputRe = /<input[^>]*\bid="setting_([^"]+)"([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = inputRe.exec(html))) {
    const key = m[1];
    if (seen.has(key) || key.endsWith("_field")) continue;

    const attrs = m[2];
    if (/type\s*=\s*"hidden"/i.test(attrs)) continue;
    seen.add(key);
    const idx = m.index ?? 0;
    const context = html.slice(Math.max(0, idx - 500), idx);
    const label = stripTags(
      context.match(/control-label[^>]*>([\s\S]*?)<\/label>/i)?.[1] ?? key,
    );
    const nearby = html.slice(idx, idx + 400);
    const isCheckbox =
      knownCheckboxKeys.has(key) ||
      /type\s*=\s*"checkbox"/i.test(attrs + nearby) ||
      /onoffswitch-checkbox/i.test(nearby);
    const isNumber =
      !isCheckbox &&
      (/input-number/i.test(attrs) ||
        /type\s*=\s*"number"/i.test(attrs) ||
        /class="[^"]*number/i.test(attrs));

    if (isCheckbox) {
      fields.push({
        key,
        label,
        type: "checkbox",
        checked: /\bchecked\b/i.test(attrs + nearby),
      });
    } else if (isNumber) {
      fields.push({
        key,
        label,
        type: "number",
        value: attrs.match(/\bvalue="([^"]*)"/i)?.[1] ?? "",
      });
    } else {
      fields.push({
        key,
        label,
        type: "text",
        value: attrs.match(/\bvalue="([^"]*)"/i)?.[1] ?? "",
      });
    }
  }

  return fields;
}

async function fetchBannerSettingsHtml(
  jar: CookieJar,
  base: string,
  formatId: string,
  type: string,
): Promise<string> {
  const path = `/banner/getSettings/${encodeURIComponent(formatId)}?type=${encodeURIComponent(type)}`;
  const res = await platformFetch(`${base}${path}`, jar, {
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json, text/html, */*",
      referer: `${base}/banner`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new HttpError(502, `Platform getSettings returned ${res.status}`, {
      code: "PLATFORM_GET_SETTINGS_FAILED",
    });
  }
  try {
    const parsed = JSON.parse(text) as { html?: string };
    if (parsed.html) return parsed.html;
  } catch {
    /* raw HTML */
  }
  return text;
}

export async function fetchBannerSettingsForTemplate(
  formatId: string,
  type: string,
): Promise<PlatformBannerSettingsFragment> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  await loginPlatform(jar, base);
  const html = await fetchBannerSettingsHtml(jar, base, formatId, type);
  const path = `/banner/getSettings/${encodeURIComponent(formatId)}?type=${encodeURIComponent(type)}`;

  return {
    formatId,
    type,
    sourceUrl: `${base}${path}`,
    fields: parseBannerSettingsFields(html),
  };
}

function appendBannerSettingsToFormData(
  fd: FormData,
  settings: Record<string, string | number>,
): void {
  for (const [key, raw] of Object.entries(settings)) {
    fd.append(`setting_${key}`, String(raw));
  }
}

/** POST /banner/store (multipart) using platform session. */
export async function submitBannerCreate(
  input: BannerCreateSubmitInput,
): Promise<{ message: string }> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  const csrf = await loginPlatform(jar, base);
  const fd = new FormData();

  fd.append("_token", csrf);
  fd.append("banner_name", input.banner_name);
  fd.append("advertiser", input.advertiser);
  fd.append("market", input.market);
  fd.append("landing_page", input.landing_page);
  fd.append("adunit", input.adunit);
  fd.append("type", input.type);
  if (input.template) fd.append("template", input.template);
  fd.append("use_tag", input.use_tag);
  fd.append("code_tag", input.code_tag);
  fd.append("notes", input.notes);
  fd.append("ad_view", input.ad_view);
  fd.append("width", String(input.width));
  fd.append("height", String(input.height));
  fd.append("active", String(input.active));
  fd.append("source", input.source);
  fd.append("banner_settings", JSON.stringify(input.banner_settings));
  appendBannerSettingsToFormData(fd, input.banner_settings);

  const res = await platformFetch(`${base}/banner/store`, jar, {
    method: "POST",
    headers: {
      referer: `${base}/banner`,
      origin: base,
    },
    body: fd,
  });

  const text = await res.text();
  let body: { message?: string; errors?: Record<string, string[]> };
  try {
    body = JSON.parse(text) as { message?: string; errors?: Record<string, string[]> };
  } catch {
    throw new HttpError(502, "Platform banner/store returned non-JSON", {
      code: "PLATFORM_BANNER_STORE_INVALID",
      details: { bodyPreview: text.slice(0, 500) },
    });
  }

  if (!res.ok) {
    const detail =
      body.message ||
      (body.errors
        ? Object.entries(body.errors)
            .map(([k, v]) => `${k}: ${v.join(", ")}`)
            .join("; ")
        : text.slice(0, 300));
    throw new HttpError(res.status === 422 ? 422 : 502, detail || "Banner create failed", {
      code: "PLATFORM_BANNER_STORE_FAILED",
    });
  }

  return { message: body.message ?? "Banner created" };
}
