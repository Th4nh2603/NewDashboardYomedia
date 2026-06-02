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
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      this.store.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
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
writeFileSync(join(__dirname, "../tmp-banner-shell.html"), shell, "utf8");
if (/getBannerAdUnit/.test(shell)) {
  const m = shell.match(/function\s+getBannerAdUnit[\s\S]{0,1500}/);
  if (m) writeFileSync(join(__dirname, "../tmp-fn-adunit-shell.txt"), m[0], "utf8");
  console.error("getBannerAdUnit inline in shell");
}
const scripts = [...shell.matchAll(/<script[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
console.error("script count", scripts.length);

for (const src of scripts) {
  const url = src.startsWith("http") ? src : `${base}${src.startsWith("/") ? "" : "/"}${src}`;
  if (!/banner|format|adunit|ad_view|yomedia|app\//i.test(url)) continue;
  try {
    const js = await (await pf(jar, url)).text();
    if (/getBannerAdUnit|getBannerFormat/.test(js)) {
      console.error("FOUND", url);
      const idx = js.indexOf("getBannerAdUnit");
      const slice = js.slice(Math.max(0, idx - 50), idx + 800);
      writeFileSync(join(__dirname, "../tmp-getBannerAdUnit.js.txt"), slice, "utf8");
    }
  } catch {
    /* skip */
  }
}

// search all scripts for getBannerAdUnit
for (const src of scripts) {
  const url = src.startsWith("http") ? src : `${base}${src.startsWith("/") ? "" : "/"}${src}`;
  try {
    const js = await (await pf(jar, url)).text();
    if (!/getBannerAdUnit/.test(js)) continue;
    console.error("getBannerAdUnit in", url);
    const m = js.match(/function\s+getBannerAdUnit[\s\S]{0,1200}/);
    if (m) writeFileSync(join(__dirname, "../tmp-fn-adunit.txt"), m[0], "utf8");
    const m2 = js.match(/getBannerAdUnit\s*=\s*function[\s\S]{0,1200}/);
    if (m2) writeFileSync(join(__dirname, "../tmp-fn-adunit2.txt"), m2[0], "utf8");
  } catch {
    /* skip */
  }
}
