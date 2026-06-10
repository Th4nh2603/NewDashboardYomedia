import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
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

for (const path of ["/reports", "/analytics", "/flight/list", "/campaign/list"]) {
  const res = await pf(jar, `${base}${path}`, {
    method: path.endsWith("/list") ? "POST" : "GET",
    headers: path.endsWith("/list")
      ? {
          "x-csrf-token": token,
          "x-requested-with": "XMLHttpRequest",
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json, text/javascript, */*; q=0.01",
        }
      : {},
    body: path.endsWith("/list")
      ? new URLSearchParams({
          _token: token,
          page: "1",
          rows: "5",
          sidx: "created_at",
          sord: "desc",
          filter: "all",
        }).toString()
      : undefined,
  });
  const text = await res.text();
  console.log(path, res.status, text.slice(0, 200).replace(/\s+/g, " "));
  if (path === "/reports") {
    writeFileSync(join(__dirname, "../tmp-reports-shell.html"), text, "utf8");
  }
}
