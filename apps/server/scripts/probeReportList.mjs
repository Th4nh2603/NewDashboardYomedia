import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "undici";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const base = (process.env.YOMEDIA_PLATFORM_BASE_URL || "https://platform.yomedia.vn").replace(
  /\/+$/,
  "",
);
const log = process.env.YOMEDIA_PLATFORM_USERNAME?.trim();
const password = process.env.YOMEDIA_PLATFORM_PASSWORD?.trim();
const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });

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

const shell = await (await pf(jar, `${base}/reports`)).text();
const csrf =
  shell.match(/content="([^"]+)"\s+name="csrf-token"/i)?.[1] ||
  shell.match(/name="_token"\s+value="([^"]+)"/i)?.[1];

const listRes = await pf(jar, `${base}/reports/list`, {
  method: "GET",
  headers: {
    "x-csrf-token": csrf,
    "x-requested-with": "XMLHttpRequest",
    referer: `${base}/reports`,
    accept: "application/json, text/javascript, */*; q=0.01",
  },
});
const listText = await listRes.text();
console.log("GET /reports/list", listRes.status, listText.slice(0, 400));

const postRes = await pf(jar, `${base}/reports/list`, {
  method: "POST",
  headers: {
    "x-csrf-token": csrf,
    "x-requested-with": "XMLHttpRequest",
    "content-type": "application/x-www-form-urlencoded",
    referer: `${base}/reports`,
    accept: "application/json, text/javascript, */*; q=0.01",
  },
  body: new URLSearchParams({
    _token: csrf,
    page: "1",
    rows: "5",
    sidx: "created_at",
    sord: "desc",
    filter: "all",
  }).toString(),
});
const postText = await postRes.text();
console.log("POST /reports/list", postRes.status, postText.slice(0, 400));
