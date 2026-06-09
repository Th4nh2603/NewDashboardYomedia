import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const base = (process.env.YOMEDIA_PLATFORM_BASE_URL || "https://platform.yomedia.vn").replace(
  /\/+$/,
  "",
);
const log = process.env.YOMEDIA_PLATFORM_USERNAME?.trim();
const password = process.env.YOMEDIA_PLATFORM_PASSWORD?.trim();

const { Agent } = await import("undici");
const dispatcher =
  process.env.YOMEDIA_PLATFORM_TLS_INSECURE !== "0"
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : undefined;

class CookieJar {
  store = new Map();
  ingest(headers) {
    const cookies =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : [headers.get("set-cookie")].filter(Boolean);
    for (const raw of cookies) {
      const part = raw.split(/,(?=\s*[^;]+=)/)[0] ?? raw;
      const [pair] = part.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      this.store.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  header() {
    return [...this.store.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function pf(jar, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    dispatcher,
    headers: { cookie: jar.header(), "user-agent": "probe", ...init.headers },
  });
  jar.ingest(res.headers);
  return res;
}

const jar = new CookieJar();
const loginHtml = await (await pf(jar, `${base}/auth/login`)).text();
const token =
  loginHtml.match(/name="_token"\s+value="([^"]+)"/i)?.[1] ||
  loginHtml.match(/content="([^"]+)"\s+name="csrf-token"/i)?.[1];
await pf(jar, `${base}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", origin: base },
  body: new URLSearchParams({ _token: token, log, password, remember: "1" }).toString(),
  redirect: "manual",
});

const shell = await (await pf(jar, `${base}/placement`)).text();
writeFileSync(join(__dirname, "../tmp-placement-shell.html"), shell, "utf8");

const csrf =
  shell.match(/content="([^"]+)"\s+name="csrf-token"/i)?.[1] ||
  shell.match(/name="_token"\s+value="([^"]+)"/i)?.[1];

console.error("title:", shell.match(/<title[^>]*>([^<]+)/i)?.[1]);
const urls = [
  ...shell.matchAll(/['"](\/placement[^'"]+)['"]/g),
  ...shell.matchAll(/url\s*:\s*['"](\/placement[^'"]+)['"]/g),
].map((m) => m[1]);
console.error("placement urls:", [...new Set(urls)]);

const hdr = {
  "x-csrf-token": csrf,
  "x-requested-with": "XMLHttpRequest",
  accept: "application/json, text/javascript, */*; q=0.01",
  referer: `${base}/placement`,
};

const paths = [
  ["POST", "/placement/list", { _token: csrf, page: "1", rows: "10", sidx: "created_at", sord: "desc", filter: "all", keyword: "", field: "", opsel: "" }],
  ["GET", "/placement/list", null],
  ["POST", "/placement/list", { _token: csrf }],
  ["GET", "/placement/create", null],
  ["POST", "/placement/create", { _token: csrf }],
];

const results = [];
for (const [method, path, fields] of paths) {
  const init = { method, headers: { ...hdr } };
  if (fields) {
    init.headers["content-type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(fields).toString();
  }
  const r = await pf(jar, `${base}${path}`, init);
  const t = await r.text();
  let parsed = null;
  try {
    parsed = JSON.parse(t);
  } catch {
    /* not json */
  }
  results.push({
    method,
    path,
    status: r.status,
    len: t.length,
    keys: parsed ? Object.keys(parsed) : null,
    rowCount: parsed?.rows?.length ?? null,
    sample: t.slice(0, 300),
  });
  if (parsed?.html) {
    writeFileSync(
      join(__dirname, `../tmp-placement-${path.replace(/\//g, "_")}.html`),
      parsed.html,
      "utf8",
    );
  }
}

writeFileSync(join(__dirname, "../tmp-placement-probe.json"), JSON.stringify(results, null, 2), "utf8");
console.log(JSON.stringify(results, null, 2));
