import { spawnSync } from "node:child_process";

const commands = [
  ["git", ["status", "--short"]],
  ["git", ["diff", "--name-status"]],
  ["git", ["diff", "--check"]],
  ["pnpm", ["verify:changed"]],
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`Review command failed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nSecurity-sensitive changed files to inspect manually:");
spawnSync("git", ["diff", "--name-only", "--", ".env*", "apps/api/src/config", "apps/api/src/mcp", "apps/api/src/ai", "apps/api/src/rag", "apps/api/src/database", "apps/api/src/modules/**/auth*", "apps/api/src/modules/**/permission*"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
