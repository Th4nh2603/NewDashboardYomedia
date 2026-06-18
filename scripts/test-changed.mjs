import { execSync, spawnSync } from "node:child_process";

const changed = execSync("git diff --name-only --cached && git diff --name-only", { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const commands = [];

if (changed.some((file) => file.startsWith("apps/web/"))) {
  commands.push(["pnpm", ["--filter", "nova-ai-creative-suite", "lint"]]);
}
if (changed.some((file) => file.startsWith("apps/api/"))) {
  commands.push(["pnpm", ["--filter", "@yomedia/api-server", "build"]]);
}
if (changed.some((file) => file.startsWith("apps/mobile/"))) {
  commands.push(["pnpm", ["--filter", "mobile", "lint"]]);
}
if (changed.some((file) => /^(apps\/web|apps\/api|packages|scripts)\//.test(file))) {
  commands.push(["pnpm", ["check:architecture"]]);
}
if (changed.some((file) => file.startsWith("evals/"))) {
  commands.push(["pnpm", ["eval"]]);
}

if (!commands.length) {
  console.log("No targeted verification commands matched changed files.");
  process.exit(0);
}

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
