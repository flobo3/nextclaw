#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const desktopDir = resolve(process.cwd());
const runtimeEntrypoint = resolve(desktopDir, "node_modules", "nextclaw", "dist", "cli", "index.js");

if (existsSync(runtimeEntrypoint)) {
  process.exit(0);
}

console.log("[desktop] nextclaw runtime dist missing, building packages/nextclaw...");
const result = spawnSync("pnpm", ["-C", "packages/nextclaw", "build"], {
  cwd: resolve(desktopDir, "..", ".."),
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!existsSync(runtimeEntrypoint)) {
  console.error("[desktop] build finished but runtime entrypoint is still missing:", runtimeEntrypoint);
  process.exit(1);
}
