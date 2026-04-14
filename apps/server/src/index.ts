import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sftpRouter } from "./routes/sftp.js";
import { ragRouter } from "./routes/rag.js";
import { uploadRouter } from "./routes/upload.js";
import { fileUploadRouter } from "./routes/fileUpload.js";
import { testDataRouter } from "./routes/testData.js";
import { errorHandler, notFoundHandler } from "./lib/httpErrors.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: (
      origin: string | undefined,
      cb: (err: null, allow: boolean | string) => void,
    ) => cb(null, origin || true),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user-role"],
  }),
);
app.use(express.json({ limit: "50mb" }));

app.use("/api/sftp", sftpRouter);
app.use("/api/rag", ragRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/file-upload", fileUploadRouter);
app.use("/api/test-data", testDataRouter);

// Simple JSON-file-based data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const accountsPath = path.join(__dirname, "data", "accounts.json");
const creativeDemosPath = path.join(__dirname, "data", "creative-demos.json");

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  roleTitle?: string;
  status?: string;
};

let accountsCache: Account[] | null = null;

function loadAccounts(): Account[] {
  if (!accountsCache) {
    const raw = fs.readFileSync(accountsPath, "utf8");
    const parsed = JSON.parse(raw) as { accounts: Account[] };
    accountsCache = parsed.accounts || [];
  }
  return accountsCache;
}

function loadCreativeDemos() {
  const raw = fs.readFileSync(creativeDemosPath, "utf8");
  const parsed = JSON.parse(raw) as { demos?: any[] };
  return parsed.demos || [];
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing email or password" });
  }

  const accounts = loadAccounts();
  // Normalize phone/password by removing spaces so formatting differences don't block login
  const normalizePhone = (value: string | undefined) =>
    (value || "").replace(/\s+/g, "");

  const account = accounts.find(
    (a) =>
      a.email.toLowerCase() === email.toLowerCase() &&
      normalizePhone(a.phone) === normalizePhone(password),
  );

  if (!account) {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid email or password" });
  }

  return res.json({
    ok: true,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      role: account.role,
      roleTitle: account.roleTitle,
      status: account.status,
    },
  });
});

app.get("/api/account-profile", (req, res) => {
  const email = String(req.query.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  const account = loadAccounts().find(
    (item) =>
      String(item.email || "")
        .trim()
        .toLowerCase() === email,
  );

  if (!account) {
    return res.status(404).json({ ok: false, error: "Account not found" });
  }

  return res.json({
    ok: true,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      roleTitle: account.roleTitle,
      status: account.status,
    },
  });
});

app.get("/api/creative-demos", (_req, res) => {
  const demos = loadCreativeDemos().filter(
    (d) => String(d?.status ?? "").toLowerCase() === "active",
  );
  return res.json({ ok: true, demos });
});

app.get("/api/creative-demo-titles", (req, res) => {
  const activeOnlyRaw = String(req.query.activeOnly ?? "").toLowerCase();
  const activeOnly =
    activeOnlyRaw === "1" ||
    activeOnlyRaw === "true" ||
    activeOnlyRaw === "yes";
  let demos = loadCreativeDemos();
  if (activeOnly) {
    demos = demos.filter(
      (d) => String(d?.status ?? "").toLowerCase() === "active",
    );
  }
  const items = demos
    .map((d) => ({
      id: String(d?.id ?? "").trim(),
      title: typeof d?.title === "string" ? d.title.trim() : "",
      category: typeof d?.category === "string" ? d.category.trim() : "",
      value: typeof d?.value === "string" ? d.value.trim() : "",
      size: Array.isArray(d?.size)
        ? d.size.map((s: unknown) => String(s ?? "").trim()).filter(Boolean)
        : typeof d?.size === "string"
          ? d.size.trim()
          : "",
      fla: d?.fla === true,
    }))
    .filter((item) => item.id && item.title);
  return res.json({ ok: true, items });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
