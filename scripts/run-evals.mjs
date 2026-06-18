import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const mode = process.argv[2] ?? "all";
const evalRoot = join(root, "evals");
const requiredDatasets = [
  "intent-classification.json",
  "agent-routing.json",
  "tool-selection.json",
  "multi-intent.json",
  "insufficient-rag-context.json",
  "citation-correctness.json",
  "unsupported-claims.json",
  "tenant-isolation.json",
  "brand-permission-isolation.json",
  "prompt-injection.json",
  "tool-authorization.json",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const selected = mode === "rag"
  ? requiredDatasets.filter((name) => name.includes("rag") || name.includes("citation") || name.includes("claim") || name.includes("tenant") || name.includes("brand"))
  : mode === "agents"
    ? requiredDatasets.filter((name) => !name.includes("rag") && !name.includes("citation"))
    : requiredDatasets;

let cases = 0;
for (const dataset of selected) {
  const path = join(evalRoot, "datasets", dataset);
  assert(statSync(path).isFile(), `Missing dataset ${relative(root, path)}`);
  const value = readJson(path);
  assert(Array.isArray(value.cases), `${dataset} must contain a cases array`);
  assert(value.metrics && typeof value.metrics === "object", `${dataset} must define metrics`);
  for (const item of value.cases) {
    assert(item.id && item.input && item.expected, `${dataset} contains a case without id, input, or expected`);
    cases += 1;
  }
}

const scenarioFiles = readdirSync(join(evalRoot, "scenarios")).filter((name) => name.endsWith(".md"));
assert(scenarioFiles.length > 0, "At least one eval scenario is required");

console.log(`Deterministic ${mode} eval fixtures validated: ${selected.length} datasets, ${cases} cases.`);
