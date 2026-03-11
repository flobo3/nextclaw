import { getApiBase, getProvider, type Config } from "@nextclaw/core";

export function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function readBoolean(input: Record<string, unknown>, key: string): boolean | undefined {
  const value = input[key];
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

export function readNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export function readRecord(input: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = input[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function readStringRecord(input: Record<string, unknown>, key: string): Record<string, string> | undefined {
  const value = readRecord(input, key);
  if (!value) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      continue;
    }
    const normalized = entryValue.trim();
    if (!normalized) {
      continue;
    }
    out[entryKey] = normalized;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function readStringOrNullRecord(
  input: Record<string, unknown>,
  key: string,
): Record<string, string | null> | undefined {
  const value = readRecord(input, key);
  if (!value) {
    return undefined;
  }
  const out: Record<string, string | null> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue === "string") {
      out[entryKey] = entryValue.trim();
      continue;
    }
    if (entryValue === null) {
      out[entryKey] = null;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function readStringArray(input: Record<string, unknown>, key: string): string[] | undefined {
  const value = input[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

export function readRequestedSkills(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) {
    return [];
  }
  const raw = metadata.requested_skills ?? metadata.requestedSkills;
  const values: string[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry !== "string") {
        continue;
      }
      const trimmed = entry.trim();
      if (trimmed) {
        values.push(trimmed);
      }
    }
  } else if (typeof raw === "string") {
    values.push(
      ...raw
        .split(/[,\s]+/g)
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }
  return Array.from(new Set(values)).slice(0, 8);
}

export function toAbortError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }
  const message = typeof reason === "string" && reason.trim() ? reason.trim() : "operation aborted";
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export function resolveEngineConfig(config: Config, model: string, engineConfig: Record<string, unknown>) {
  const provider = getProvider(config, model);
  const apiKey = readString(engineConfig, "apiKey") ?? provider?.apiKey ?? undefined;
  const apiBase = readString(engineConfig, "apiBase") ?? getApiBase(config, model) ?? undefined;
  return { apiKey, apiBase };
}
