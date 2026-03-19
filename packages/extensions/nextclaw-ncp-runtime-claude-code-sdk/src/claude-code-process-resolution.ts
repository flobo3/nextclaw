import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";

const require = createRequire(import.meta.url);

export function resolveBundledClaudeAgentSdkCliPath(): string | undefined {
  try {
    const packageJsonPath = require.resolve("@anthropic-ai/claude-agent-sdk/package.json");
    const cliPath = join(dirname(packageJsonPath), "cli.js");
    return existsSync(cliPath) ? cliPath : undefined;
  } catch {
    return undefined;
  }
}

export function resolveCurrentProcessExecutable(): string | undefined {
  const execPath = process.execPath?.trim();
  if (!execPath || !isAbsolute(execPath)) {
    return undefined;
  }
  return existsSync(execPath) ? execPath : undefined;
}
