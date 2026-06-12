import { Agent } from "undici";
import { HttpError } from "../../../lib/http/errors.js";

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

export type PlatformPlacementPage = {
  url: string;
  fetchedAt: string;
  title: string;
  grid: PlatformBannerGrid;
  createForm: PlatformBannerCreateForm;
};

export type PlatformTestSnapshot = {
  fetchedAt: string;
  profileName: string | null;
  profileRole: string | null;
  banner: PlatformBannerPage;
  placement: PlatformPlacementPage;
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

  const numberMatch = block.match(
    /<input[^>]*type="number"[^>]*name="([^"]*)"[^>]*>/i,
  );
  if (numberMatch) {
    const tag = numberMatch[0];
    const value = tag.match(/\bvalue="([^"]*)"/i)?.[1] ?? "";
    return {
      id: groupId,
      name: numberMatch[1],
      label,
      type: "text",
      value,
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

function labelBeforeIndex(block: string, index: number): string {
  const before = block.slice(0, index);
  const labels = [
    ...before.matchAll(
      /<label[^>]*class="[^"]*control-label[^"]*"[^>]*>([\s\S]*?)<\/label>/gi,
    ),
  ];
  if (labels.length === 0) return "";
  return stripTags(labels[labels.length - 1][1]);
}

/** Every named control in a form-group (placement create has many per group). */
function allFieldsFromFormGroup(
  block: string,
  groupId: string,
  maxSelectOptions = MAX_SELECT_OPTIONS,
): PlatformFormField[] {
  type ControlHit = { index: number; field: PlatformFormField };
  const hits: ControlHit[] = [];
  let seq = 0;

  const selectRe = /<select[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi;
  let m: RegExpExecArray | null;
  while ((m = selectRe.exec(block))) {
    const name = m[1];
    const { options, total } = parseSelectOptions(m[2], maxSelectOptions);
    const selected = options.find((o) => o.selected);
    const label = labelBeforeIndex(block, m.index ?? 0) || name;
    hits.push({
      index: m.index ?? 0,
      field: {
        id: `${groupId}__${name}__${seq++}`,
        name,
        label,
        type: "select",
        value: selected?.value,
        options,
        optionTotal:
          maxSelectOptions < total ? total : undefined,
      },
    });
  }

  const textareaRe = /<textarea[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/textarea>/gi;
  while ((m = textareaRe.exec(block))) {
    const name = m[1];
    hits.push({
      index: m.index ?? 0,
      field: {
        id: `${groupId}__${name}__${seq++}`,
        name,
        label: labelBeforeIndex(block, m.index ?? 0) || name,
        type: "textarea",
        value: stripTags(m[2]),
      },
    });
  }

  const inputRe = /<input\b[^>]*\/?>/gi;
  while ((m = inputRe.exec(block))) {
    const tag = m[0];
    const name = tag.match(/\bname="([^"]*)"/i)?.[1];
    if (!name) continue;
    const inputType = tag.match(/\btype="([^"]*)"/i)?.[1]?.toLowerCase() ?? "text";
    if (inputType === "hidden" || inputType === "submit" || inputType === "file") {
      continue;
    }
    const label = labelBeforeIndex(block, m.index ?? 0) || name;
    if (inputType === "checkbox") {
      hits.push({
        index: m.index ?? 0,
        field: {
          id: `${groupId}__${name}__${seq++}`,
          name,
          label,
          type: "checkbox",
          checked: /\bchecked\b/i.test(tag),
        },
      });
    } else {
      const value = tag.match(/\bvalue="([^"]*)"/i)?.[1] ?? "";
      hits.push({
        index: m.index ?? 0,
        field: {
          id: `${groupId}__${name}__${seq++}`,
          name,
          label,
          type: "text",
          value,
          placeholder: tag.match(/\bplaceholder="([^"]*)"/i)?.[1],
        },
      });
    }
  }

  hits.sort((a, b) => a.index - b.index);
  return hits.map((h) => h.field);
}

function resolveFormGroupId(groupId: string, field: PlatformFormField): string {
  if (groupId === "type" && field.name === "ad_view") return "ad_view";
  if (groupId === "type" && field.name === "type") return "banner_type";
  return groupId || field.name;
}

function extractFormGroups(
  html: string,
  options?: { includeHidden?: boolean },
): { id: string; block: string }[] {
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
    if (!options?.includeHidden && /style="display:\s*none"/i.test(openTag)) {
      continue;
    }
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

export function parsePlacementCreateForm(
  html: string,
  options?: { maxSelectOptions?: number; includeHidden?: boolean },
): PlatformBannerCreateForm {
  const maxSelectOptions = options?.maxSelectOptions ?? MAX_SELECT_OPTIONS;
  const title = stripTags(
    html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "Create a Placement",
  );
  const formAction =
    html.match(/<form[^>]*action="([^"]+)"/i)?.[1] ||
    `${platformBaseUrl()}/placement/store`;

  const fields: PlatformFormField[] = [];
  for (const { id, block } of extractFormGroups(html, {
    includeHidden: options?.includeHidden,
  })) {
    const groupFields = allFieldsFromFormGroup(block, id, maxSelectOptions);
    for (const field of groupFields) {
      if (id === "type" && field.name === "type") field.id = "placement_type";
      if (field.name === "active") field.id = "active";
      fields.push(field);
    }
  }

  const base = platformBaseUrl();
  return {
    url: `${base}/placement/create`,
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
  init?: RequestInit & { refererPath?: string },
): Promise<string> {
  const refererPath = init?.refererPath ?? "/banner";
  const { refererPath: _omit, ...restInit } = init ?? {};
  const res = await platformFetch(`${base}${path}`, jar, {
    ...restInit,
    headers: {
      "x-csrf-token": csrf,
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
      referer: `${base}${refererPath}`,
      ...restInit.headers,
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

const DEFAULT_BANNER_COLUMNS: PlatformBannerColumn[] = [
  { name: "num_id", label: "ID" },
  { name: "banner_name", label: "Banner name" },
  { name: "account_name", label: "Advertiser" },
  { name: "ad_format", label: "Format" },
  { name: "active", label: "Active" },
  { name: "updated_at", label: "Last Updated" },
];

const DEFAULT_PLACEMENT_COLUMNS: PlatformBannerColumn[] = [
  { name: "placement_name", label: "Placement Name" },
  { name: "account_name", label: "Account Name" },
  { name: "website_name", label: "Website Name" },
  { name: "zone_name", label: "Zone Name" },
  { name: "type", label: "Type" },
  { name: "size", label: "Size" },
  { name: "active", label: "Active" },
  { name: "updated_at", label: "Last Updated" },
];

async function fetchPlacementListFragment(
  jar: CookieJar,
  base: string,
  csrf: string,
): Promise<string> {
  return fetchPlatformJsonHtml(jar, base, "/placement/list", csrf, {
    method: "POST",
    refererPath: "/placement",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ _token: csrf }).toString(),
  });
}

async function fetchPlacementCreateFragment(
  jar: CookieJar,
  base: string,
): Promise<string> {
  const res = await platformFetch(`${base}/placement/create`, jar, {
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
      referer: `${base}/placement`,
    },
  });
  const text = await res.text();
  let parsed: { html?: string };
  try {
    parsed = JSON.parse(text) as { html?: string };
  } catch {
    throw new HttpError(502, "Platform /placement/create did not return JSON", {
      code: "PLATFORM_FRAGMENT_INVALID",
    });
  }
  if (!parsed.html) {
    throw new HttpError(502, "Platform /placement/create missing html fragment", {
      code: "PLATFORM_FRAGMENT_INVALID",
    });
  }
  return parsed.html;
}

async function fetchPlacementGrid(
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

  const res = await platformFetch(`${base}/placement/list`, jar, {
    method: "POST",
    headers: {
      "x-csrf-token": csrf,
      "x-requested-with": "XMLHttpRequest",
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/javascript, */*; q=0.01",
      referer: `${base}/placement`,
    },
    body: body.toString(),
  });

  const text = await res.text();
  let json: {
    rows?: Record<string, unknown>[];
    page?: number;
    total?: number;
    records?: number;
  };
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(502, "Platform placement grid returned invalid JSON", {
      code: "PLATFORM_GRID_INVALID",
    });
  }

  if (!Array.isArray(json.rows)) {
    throw new HttpError(502, "Platform placement grid missing rows array", {
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

const PLATFORM_GRID_PAGE_SIZE = 500;

export type PlacementEmbedCodeVariant = "standard" | "rtb";

export type PlacementEmbedCode = {
  placementId: string;
  variant: PlacementEmbedCodeVariant;
  sourceUrl: string;
  fetchedAt: string;
  code: string;
  meta: {
    placementName: string | null;
    account: string | null;
    site: string | null;
    size: string | null;
    type: string | null;
  };
};

function parsePlacementCodeMeta(code: string): PlacementEmbedCode["meta"] {
  const m = code.match(
    /\/\*\s*load placement:\s*([^,]+),\s*for account:\s*([^,]+),\s*site:\s*([^,]+),\s*size:\s*([^-]+)\s*-\s*(\S+)\s*\*\//i,
  );
  if (!m) {
    return {
      placementName: null,
      account: null,
      site: null,
      size: null,
      type: null,
    };
  }
  return {
    placementName: m[1].trim() || null,
    account: m[2].trim() || null,
    site: m[3].trim() || null,
    size: m[4].trim() || null,
    type: m[5].trim() || null,
  };
}

async function fetchPlacementEmbedCodeWithJar(
  jar: CookieJar,
  base: string,
  placementId: string,
  variant: PlacementEmbedCodeVariant,
): Promise<PlacementEmbedCode> {
  const path =
    variant === "rtb"
      ? `/placement/${encodeURIComponent(placementId)}/code-binding`
      : `/placement/${encodeURIComponent(placementId)}/code`;

  const res = await platformFetch(`${base}${path}`, jar, {
    headers: {
      referer: `${base}/placement`,
      accept: "text/html, */*",
    },
  });
  const code = await res.text();
  if (!res.ok) {
    throw new HttpError(502, `Platform ${path} returned ${res.status}`, {
      code: "PLATFORM_PLACEMENT_CODE_FAILED",
    });
  }

  return {
    placementId,
    variant,
    sourceUrl: `${base}${path}`,
    fetchedAt: new Date().toISOString(),
    code,
    meta: parsePlacementCodeMeta(code),
  };
}

/**
 * Placement context menu → Get Code / Get Code RTB.
 * GET /placement/{id}/code or /placement/{id}/code-binding (raw HTML/JS snippet).
 */
export async function fetchPlacementEmbedCode(
  placementId: string,
  variant: PlacementEmbedCodeVariant = "standard",
): Promise<PlacementEmbedCode> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  await loginPlatform(jar, base);
  return fetchPlacementEmbedCodeWithJar(jar, base, placementId, variant);
}

export type PlacementCodeBatchRow = {
  id: string;
  placement_name?: unknown;
  website_name?: unknown;
};

export type PlacementCodeBatchItem = {
  placementId: string;
  placementName: string;
  websiteName: string;
  code: string;
};

const PLACEMENT_CODE_BATCH_CONCURRENCY = 4;

/** One platform login; fetch embed code for many placements. */
export async function fetchPlacementEmbedCodesBatch(
  placements: PlacementCodeBatchRow[],
  variant: PlacementEmbedCodeVariant = "standard",
): Promise<PlacementCodeBatchItem[]> {
  if (placements.length === 0) return [];

  const base = platformBaseUrl();
  const jar = new CookieJar();
  await loginPlatform(jar, base);

  const results: PlacementCodeBatchItem[] = new Array(placements.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= placements.length) return;

      const row = placements[i];
      const placementId = String(row.id);
      const data = await fetchPlacementEmbedCodeWithJar(
        jar,
        base,
        placementId,
        variant,
      );
      results[i] = {
        placementId,
        placementName: String(row.placement_name ?? ""),
        websiteName: String(row.website_name ?? ""),
        code: data.code,
      };
    }
  }

  const workers = Math.min(
    PLACEMENT_CODE_BATCH_CONCURRENCY,
    placements.length,
  );
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/** Fetch every placement row (paginates POST /placement/list). */
async function fetchPlacementGridAll(
  jar: CookieJar,
  base: string,
  csrf: string,
): Promise<PlatformBannerGrid> {
  const first = await fetchPlacementGrid(jar, base, csrf, {
    page: 1,
    rows: PLATFORM_GRID_PAGE_SIZE,
  });
  const allRows = [...first.rows];
  const totalPages = first.total;

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchPlacementGrid(jar, base, csrf, {
      page,
      rows: PLATFORM_GRID_PAGE_SIZE,
    });
    allRows.push(...next.rows);
  }

  return {
    page: 1,
    total: 1,
    records: first.records,
    rows: allRows,
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
      : DEFAULT_BANNER_COLUMNS;

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

/** Login once; fetch /banner and /placement lists + create forms. */
export async function fetchPlatformTestSnapshot(options?: {
  page?: number;
  rows?: number;
}): Promise<PlatformTestSnapshot> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  const csrf = await loginPlatform(jar, base);
  const fetchedAt = new Date().toISOString();

  const [bannerShellHtml, placementShellHtml] = await Promise.all([
    platformFetch(`${base}/banner`, jar).then((r) => r.text()),
    platformFetch(`${base}/placement`, jar).then((r) => r.text()),
  ]);

  const { profileName, profileRole } = parseProfile(bannerShellHtml);
  const bannerTitle = stripTags(
    bannerShellHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
  );
  const placementTitle = stripTags(
    placementShellHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
  );

  const [
    bannerListHtml,
    bannerCreateHtml,
    bannerGrid,
    placementListHtml,
    placementCreateHtml,
    placementGrid,
  ] = await Promise.all([
    fetchBannerListFragment(jar, base, csrf),
    fetchBannerCreateFragment(jar, base, csrf),
    fetchBannerGrid(jar, base, csrf, options),
    fetchPlacementListFragment(jar, base, csrf),
    fetchPlacementCreateFragment(jar, base),
    fetchPlacementGridAll(jar, base, csrf),
  ]);

  const bannerCreateForm = parseBannerCreateForm(bannerCreateHtml);
  const bannerColumns = parseJqGridColModel(bannerListHtml);
  bannerGrid.columns =
    bannerColumns.length > 0 ? bannerColumns : DEFAULT_BANNER_COLUMNS;

  const placementCreateForm = parsePlacementCreateForm(placementCreateHtml, {
    maxSelectOptions: Number.MAX_SAFE_INTEGER,
    includeHidden: true,
  });
  const placementColumns = parseJqGridColModel(placementListHtml);
  placementGrid.columns =
    placementColumns.length > 0 ? placementColumns : DEFAULT_PLACEMENT_COLUMNS;

  return {
    fetchedAt,
    profileName,
    profileRole,
    banner: {
      url: `${base}/banner`,
      fetchedAt,
      title: bannerTitle,
      profileName,
      profileRole,
      grid: bannerGrid,
      createForm: bannerCreateForm,
    },
    placement: {
      url: `${base}/placement`,
      fetchedAt,
      title: placementTitle,
      grid: placementGrid,
      createForm: placementCreateForm,
    },
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

export type PlatformModuleKey =
  | "banner"
  | "flight"
  | "placement"
  | "campaign"
  | "report";

const DEFAULT_FLIGHT_COLUMNS: PlatformBannerColumn[] = [
  { name: "num_id", label: "ID" },
  { name: "flight_name", label: "Flight name" },
  { name: "account_name", label: "Advertiser" },
  { name: "bookings_count", label: "Bookings" },
  { name: "active", label: "Active" },
  { name: "updated_at", label: "Last Updated" },
];

const DEFAULT_CAMPAIGN_COLUMNS: PlatformBannerColumn[] = [
  { name: "num_id", label: "ID" },
  { name: "campaign_name", label: "Campaign name" },
  { name: "account_name", label: "Advertiser" },
  { name: "action_status", label: "Status" },
  { name: "active", label: "Active" },
  { name: "updated_at", label: "Last Updated" },
];

const MODULE_NAME_COLUMNS: Record<
  Exclude<PlatformModuleKey, "report">,
  string
> = {
  banner: "banner_name",
  flight: "flight_name",
  placement: "placement_name",
  campaign: "campaign_name",
};

const MODULE_DEFAULT_COLUMNS: Partial<
  Record<Exclude<PlatformModuleKey, "report">, PlatformBannerColumn[]>
> = {
  banner: DEFAULT_BANNER_COLUMNS,
  placement: DEFAULT_PLACEMENT_COLUMNS,
  flight: DEFAULT_FLIGHT_COLUMNS,
  campaign: DEFAULT_CAMPAIGN_COLUMNS,
};

function parseGenericCreateForm(
  html: string,
  module: Exclude<PlatformModuleKey, "report">,
  options?: { maxSelectOptions?: number; includeHidden?: boolean },
): PlatformBannerCreateForm {
  const maxSelectOptions = options?.maxSelectOptions ?? MAX_SELECT_OPTIONS;
  const base = platformBaseUrl();
  const title = stripTags(
    html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ||
      `Create ${module}`,
  );
  const formAction =
    html.match(/<form[^>]*action="([^"]+)"/i)?.[1] ||
    `${base}/${module}/store`;

  const fields: PlatformFormField[] = [];
  for (const { id, block } of extractFormGroups(html, {
    includeHidden: options?.includeHidden,
  })) {
    if (module === "placement") {
      const groupFields = allFieldsFromFormGroup(block, id, maxSelectOptions);
      for (const field of groupFields) {
        if (id === "type" && field.name === "type") field.id = "placement_type";
        if (field.name === "active") field.id = "active";
        fields.push(field);
      }
      continue;
    }
    const field = fieldFromFormGroup(block, id, maxSelectOptions);
    if (!field) continue;
    field.id = resolveFormGroupId(id, field);
    if (field.name === "active") field.id = "active";
    fields.push(field);
  }

  return {
    url: `${base}/${module}/create`,
    title,
    formAction,
    fields,
  };
}

function parseReportsFilterForm(shellHtml: string): PlatformBannerCreateForm {
  const base = platformBaseUrl();
  const formMatch = shellHtml.match(
    /<form[^>]*id="frmFilter"[^>]*>([\s\S]*?)<\/form>/i,
  );
  const formHtml = formMatch?.[1] ?? shellHtml;
  const title = stripTags(
    shellHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "Report",
  );
  const formAction =
    shellHtml.match(/<form[^>]*id="frmFilter"[^>]*action="([^"]+)"/i)?.[1] ||
    `${base}/reports/list`;

  const fields: PlatformFormField[] = [];
  for (const { id, block } of extractFormGroups(formHtml, {
    includeHidden: true,
  })) {
    const groupFields = allFieldsFromFormGroup(
      block,
      id,
      MAX_SELECT_OPTIONS,
    );
    for (const field of groupFields) {
      fields.push(field);
    }
  }

  return {
    url: `${base}/reports`,
    title: `${title} filters`,
    formAction,
    fields,
  };
}

async function fetchModuleCreateFragment(
  jar: CookieJar,
  base: string,
  module: Exclude<PlatformModuleKey, "report">,
): Promise<string> {
  if (module === "banner") {
    const csrf = extractCsrfToken(
      await platformFetch(`${base}/banner`, jar).then((r) => r.text()),
    );
    return fetchBannerCreateFragment(jar, base, csrf);
  }

  const res = await platformFetch(`${base}/${module}/create`, jar, {
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
      referer: `${base}/${module}`,
    },
  });
  const text = await res.text();
  let parsed: { html?: string };
  try {
    parsed = JSON.parse(text) as { html?: string };
  } catch {
    throw new HttpError(502, `Platform /${module}/create did not return JSON`, {
      code: "PLATFORM_FRAGMENT_INVALID",
    });
  }
  if (!parsed.html) {
    throw new HttpError(502, `Platform /${module}/create missing html fragment`, {
      code: "PLATFORM_FRAGMENT_INVALID",
    });
  }
  return parsed.html;
}

async function fetchModuleListFragment(
  jar: CookieJar,
  base: string,
  csrf: string,
  module: Exclude<PlatformModuleKey, "report">,
): Promise<string> {
  if (module === "banner") {
    return fetchBannerListFragment(jar, base, csrf);
  }
  return fetchPlatformJsonHtml(jar, base, `/${module}/list`, csrf, {
    method: "POST",
    refererPath: `/${module}`,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ _token: csrf }).toString(),
  });
}

async function fetchModuleGrid(
  jar: CookieJar,
  base: string,
  csrf: string,
  module: Exclude<PlatformModuleKey, "report">,
  options?: { page?: number; rows?: number },
): Promise<PlatformBannerGrid> {
  if (module === "banner") {
    return fetchBannerGrid(jar, base, csrf, options);
  }
  if (module === "placement") {
    return fetchPlacementGrid(jar, base, csrf, options);
  }

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

  const res = await platformFetch(`${base}/${module}/list`, jar, {
    method: "POST",
    headers: {
      "x-csrf-token": csrf,
      "x-requested-with": "XMLHttpRequest",
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/javascript, */*; q=0.01",
      referer: `${base}/${module}`,
    },
    body: body.toString(),
  });

  const text = await res.text();
  let json: {
    rows?: Record<string, unknown>[];
    page?: number;
    total?: number;
    records?: number;
  };
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(502, `Platform ${module} grid returned invalid JSON`, {
      code: "PLATFORM_GRID_INVALID",
    });
  }

  if (!Array.isArray(json.rows)) {
    throw new HttpError(502, `Platform ${module} grid missing rows array`, {
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

async function fetchModuleGridAll(
  jar: CookieJar,
  base: string,
  csrf: string,
  module: Exclude<PlatformModuleKey, "report">,
): Promise<PlatformBannerGrid> {
  if (module === "placement") {
    return fetchPlacementGridAll(jar, base, csrf);
  }

  const first = await fetchModuleGrid(jar, base, csrf, module, {
    page: 1,
    rows: PLATFORM_GRID_PAGE_SIZE,
  });
  const allRows = [...first.rows];
  const totalPages = first.total;

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchModuleGrid(jar, base, csrf, module, {
      page,
      rows: PLATFORM_GRID_PAGE_SIZE,
    });
    allRows.push(...next.rows);
  }

  return {
    page: 1,
    total: 1,
    records: first.records,
    rows: allRows,
    columns: [],
  };
}

export function platformModuleNameColumn(
  module: Exclude<PlatformModuleKey, "report">,
): string {
  return MODULE_NAME_COLUMNS[module];
}

/** Fetch a single YoMedia platform module (banner, flight, placement, campaign, report). */
export async function fetchPlatformModulePage(
  module: PlatformModuleKey,
  options?: { page?: number; rows?: number; loadAllRows?: boolean },
): Promise<PlatformBannerPage | PlatformPlacementPage> {
  const base = platformBaseUrl();
  const jar = new CookieJar();
  const csrf = await loginPlatform(jar, base);
  const fetchedAt = new Date().toISOString();

  if (module === "report") {
    const shellRes = await platformFetch(`${base}/reports`, jar);
    const shellHtml = await shellRes.text();
    const title = stripTags(
      shellHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
    );
    const { profileName, profileRole } = parseProfile(shellHtml);
    const createForm = parseReportsFilterForm(shellHtml);

    return {
      url: `${base}/reports`,
      fetchedAt,
      title,
      profileName,
      profileRole,
      grid: {
        page: 1,
        total: 0,
        records: 0,
        rows: [],
        columns: [],
      },
      createForm,
    };
  }

  const shellRes = await platformFetch(`${base}/${module}`, jar);
  const shellHtml = await shellRes.text();
  const title = stripTags(
    shellHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
  );
  const { profileName, profileRole } = parseProfile(shellHtml);

  const [listHtml, createHtml, grid] = await Promise.all([
    fetchModuleListFragment(jar, base, csrf, module),
    fetchModuleCreateFragment(jar, base, module),
    options?.loadAllRows
      ? fetchModuleGridAll(jar, base, csrf, module)
      : fetchModuleGrid(jar, base, csrf, module, options),
  ]);

  const createForm = parseGenericCreateForm(createHtml, module, {
    includeHidden: module === "placement",
    maxSelectOptions:
      module === "placement" ? Number.MAX_SAFE_INTEGER : MAX_SELECT_OPTIONS,
  });
  const columns = parseJqGridColModel(listHtml);
  grid.columns =
    columns.length > 0
      ? columns
      : MODULE_DEFAULT_COLUMNS[module] ?? DEFAULT_BANNER_COLUMNS;

  return {
    url: `${base}/${module}`,
    fetchedAt,
    title,
    profileName,
    profileRole,
    grid,
    createForm,
  };
}
