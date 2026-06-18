import { spawnSync } from "node:child_process";

const commands = [
  ["pnpm", ["--filter", "nova-ai-creative-suite", "lint"]],
  ["pnpm", ["--filter", "@yomedia/api-server", "build"]],
  ["pnpm", ["--filter", "nova-ai-creative-suite", "build"]],
  ["pnpm", ["--filter", "mobile", "lint"]],
  ["pnpm", ["check:architecture"]],
  ["pnpm", ["eval"]],
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`Command failed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nVerification passed.");
