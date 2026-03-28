import type { CodexSdkNcpAgentRuntimeConfig } from "./index.js";

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value;
}

function copyProcessEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    const normalized = readString(value);
    if (normalized === undefined) {
      continue;
    }
    env[key] = normalized;
  }
  return env;
}

export function buildCodexCliEnv(
  config: CodexSdkNcpAgentRuntimeConfig,
): Record<string, string> | undefined {
  const env = copyProcessEnv();

  for (const [key, value] of Object.entries(config.env ?? {})) {
    if (typeof value !== "string") {
      continue;
    }
    env[key] = value;
  }

  if (config.apiKey.trim()) {
    env.OPENAI_API_KEY = config.apiKey;
  }
  if (config.apiBase?.trim()) {
    env.OPENAI_BASE_URL = config.apiBase.trim();
  }

  return Object.keys(env).length > 0 ? env : undefined;
}
