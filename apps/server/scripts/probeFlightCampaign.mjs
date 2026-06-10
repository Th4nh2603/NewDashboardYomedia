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

for (const mod of ["flight", "campaign"]) {
  const shell = await (await pf(jar, `${base}/${mod}`)).text();
  const csrf =
    shell.match(/content="([^"]+)"\s+name="csrf-token"/i)?.[1] ||
    shell.match(/name="_token"\s+value="([^"]+)"/i)?.[1];

  const listFrag = await pf(jar, `${base}/${mod}/list`, {
    method: "POST",
    headers: {
      "x-csrf-token": csrf,
      "x-requested-with": "XMLHttpRequest",
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      referer: `${base}/${mod}`,
    },
    body: new URLSearchParams({ _token: csrf }).toString(),
  });
  const listJson = await listFrag.text();
  console.log(mod, "list fragment", listFrag.status, listJson.slice(0, 120));

  const createRes = await pf(jar, `${base}/${mod}/create`, {
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
      referer: `${base}/${mod}`,
    },
  });
  const createJson = await createRes.text();
  console.log(mod, "create fragment", createRes.status, createJson.slice(0, 120));
  if (mod === "flight") {
    try {
      const parsed = JSON.parse(createJson);
      if (parsed.html) writeFileSync(join(__dirname, "../tmp-flight-create.html"), parsed.html, "utf8");
    } catch {}
  }
}
