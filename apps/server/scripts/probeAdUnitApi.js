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

const shell = await (await pf(jar, `${base}/banner`)).text();
const csrf =
  shell.match(/content="([^"]+)"\s+name="csrf-token"/i)?.[1] ||
  shell.match(/name="_token"\s+value="([^"]+)"/i)?.[1];

const hdr = {
  "x-csrf-token": csrf,
  "x-requested-with": "XMLHttpRequest",
  accept: "application/json",
  referer: `${base}/banner`,
};

const createGet = await pf(jar, `${base}/banner/create`, { headers: hdr });
const createJson = await createGet.json();
const html = createJson.html || "";
writeFileSync(join(__dirname, "../tmp-banner-create.html"), html, "utf8");

const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(
  (m) => m[1],
);
const combined = scriptBlocks.join("\n");
const urls = [...combined.matchAll(/['"](\/banner\/[^'"]+)['"]/g)].map((m) => m[1]);
const uniqUrls = [...new Set(urls)];
console.error("banner urls in scripts:", uniqUrls);

const adViewSnippets = [];
for (const re of [/ad_view[\s\S]{0,300}/gi, /adunit[\s\S]{0,300}/gi, /getAdUnit[\s\S]{0,200}/gi]) {
  let m;
  while ((m = re.exec(combined))) adViewSnippets.push(m[0]);
}
writeFileSync(
  join(__dirname, "../tmp-adunit-snippets.txt"),
  [...new Set(adViewSnippets)].slice(0, 40).join("\n\n---\n\n"),
  "utf8",
);

const paths = [
  ["GET", `/banner/create?ad_view=mobile`],
  ["POST", `/banner/create`, { ad_view: "mobile" }],
  ["GET", `/banner/adunit?ad_view=mobile`],
  ["POST", `/banner/adunit`, { ad_view: "mobile" }],
  ["GET", `/banner/adunits?ad_view=mobile`],
  ["POST", `/banner/adunits`, { ad_view: "mobile" }],
  ["POST", `/banner/get-adunit`, { ad_view: "mobile" }],
  ["POST", `/banner/adunit/list`, { ad_view: "mobile" }],
  ["GET", `/banner/adunit/list/mobile`],
  ["POST", `/banner/load-adunit`, { ad_view: "mobile" }],
];

const results = [];
for (const [method, path, fields] of paths) {
  const init = { method, headers: { ...hdr } };
  if (fields) {
    init.headers["content-type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams({ _token: csrf, ...fields }).toString();
  }
  const r = await pf(jar, `${base}${path}`, init);
  const t = await r.text();
  const hasOptions = /<option/i.test(t);
  const optionCount = (t.match(/<option/gi) || []).length;
  results.push({ method, path, status: r.status, len: t.length, hasOptions, optionCount, sample: t.slice(0, 200) });
  if (hasOptions && optionCount > 0) {
    writeFileSync(
      join(__dirname, `../tmp-response-${path.replace(/\//g, "_")}.txt`),
      t,
      "utf8",
    );
  }
}

writeFileSync(
  join(__dirname, "../tmp-adunit-probe-results.json"),
  JSON.stringify(results, null, 2),
  "utf8",
);
console.error(JSON.stringify(results, null, 2));
