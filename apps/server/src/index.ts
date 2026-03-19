import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sftpRouter } from "./routes/sftp.js";
import { uploadRouter } from "./routes/upload.js";
import { ragRouter } from "./routes/rag.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: null, allow: boolean | string) => void) =>
      cb(null, origin || true),
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "50mb" }));

app.use("/api/sftp", sftpRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/rag", ragRouter);

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
  status?: string;
};

let accountsCache: Account[] | null = null;
let creativeDemosCache: any[] | null = null;

function loadAccounts(): Account[] {
  if (!accountsCache) {
    const raw = fs.readFileSync(accountsPath, "utf8");
    const parsed = JSON.parse(raw) as { accounts: Account[] };
    accountsCache = parsed.accounts || [];
  }
  return accountsCache;
}

function loadCreativeDemos() {
  if (!creativeDemosCache) {
    const raw = fs.readFileSync(creativeDemosPath, "utf8");
    const parsed = JSON.parse(raw) as { demos: any[] };
    creativeDemosCache = parsed.demos || [];
  }
  return creativeDemosCache;
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Missing email or password" });
  }

  const accounts = loadAccounts();
  // Normalize phone/password by removing spaces so formatting differences don't block login
  const normalizePhone = (value: string | undefined) => (value || "").replace(/\s+/g, "");

  const account = accounts.find(
    (a) =>
      a.email.toLowerCase() === email.toLowerCase() &&
      normalizePhone(a.phone) === normalizePhone(password),
  );

  if (!account) {
    return res.status(401).json({ ok: false, error: "Invalid email or password" });
  }

  return res.json({
    ok: true,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      role: account.role,
      status: account.status,
    },
  });
});

app.get("/api/creative-demos", (_req, res) => {
  const demos = loadCreativeDemos();
  return res.json({ ok: true, demos });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

