import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const violations = [];
const warnings = [];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);

function walk(dir) {
  const entries = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) entries.push(...walk(full));
    else entries.push(full);
  }
  return entries;
}

function extname(file) {
  const index = file.lastIndexOf(".");
  return index === -1 ? "" : file.slice(index);
}

function read(file) {
  return readFileSync(file, "utf8");
}

function addViolation(file, message) {
  violations.push(`${relative(root, file)}: ${message}`);
}

function addWarning(file, message) {
  warnings.push(`${relative(root, file)}: ${message}`);
}

const files = statSync(root).isDirectory() ? walk(root).filter((file) => sourceExtensions.has(extname(file))) : [];

for (const file of files) {
  const rel = relative(root, file).split(sep).join("/");
  const text = read(file);

  if (rel.startsWith("apps/web/")) {
    if (/from\s+["'](?:\.\.\/)+api\b|from\s+["']apps\/api|from\s+["']@yomedia\/(?:database|ai|rag|agents)\b/.test(text)) {
      addViolation(file, "frontend imports backend-only modules or packages");
    }
    if (/from\s+["'].*(?:database\.client|prisma|@prisma\/client)/.test(text)) {
      addViolation(file, "frontend imports database or Prisma code");
    }
    if (/process\.env\.(?!NODE_ENV|VITE_)/.test(text)) {
      addViolation(file, "frontend reads non-Vite environment variables");
    }
  }

  if (rel.startsWith("apps/api/src/trpc/routers/") && /(?:databaseClient|@prisma\/client|src\/database|database\.client)/.test(text)) {
    addViolation(file, "tRPC router imports database clients directly");
  }

  if (/apps\/api\/src\/.*(?:controller|route|router).*\.ts$/.test(rel) && /(?:databaseClient|@prisma\/client|database\.client)/.test(text)) {
    addViolation(file, "controller/router imports database clients directly");
  }

  if (rel.startsWith("apps/api/src/modules/") && rel.endsWith(".service.ts")) {
    if (/from\s+["']express["']|:\s*(?:Request|Response)\b|<\s*(?:Request|Response)\s*>/.test(text)) {
      addViolation(file, "service depends on Express Request or Response");
    }
    if (/(?:databaseClient|@prisma\/client|database\.client)/.test(text)) {
      addViolation(file, "service imports database clients directly instead of repositories");
    }
  }

  if (rel.startsWith("apps/api/src/") && /(findMany|findFirst|findUnique|queryRaw|executeRaw)/.test(text)) {
    if (!/(tenantId|tenant_id|brandId|brand_id|permittedBrandIds|authorizedBrandIds)/.test(text)) {
      addWarning(file, "database-like query has no obvious tenant or brand scope; inspect manually");
    }
  }
}

if (warnings.length) {
  console.log("Architecture warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (violations.length) {
  console.error("Architecture violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Architecture checks passed.");
