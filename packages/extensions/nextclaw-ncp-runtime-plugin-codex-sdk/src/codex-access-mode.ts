export const DEFAULT_CODEX_ACCESS_MODE = "full-access";
const CODEX_ACCESS_MODES = ["read-only", "workspace-write", "full-access"] as const;
const LEGACY_CODEX_SANDBOX_MODES = ["read-only", "workspace-write", "danger-full-access"] as const;

export const CODEX_APPROVAL_POLICY = "never";

export type CodexAccessMode = (typeof CODEX_ACCESS_MODES)[number];
export type CodexSandboxMode = (typeof LEGACY_CODEX_SANDBOX_MODES)[number];

function readEnumString<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): T | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return allowedValues.includes(normalized as T) ? (normalized as T) : undefined;
}

function mapLegacySandboxModeToAccessMode(sandboxMode: CodexSandboxMode): CodexAccessMode {
  switch (sandboxMode) {
    case "read-only":
      return "read-only";
    case "workspace-write":
      return "workspace-write";
    case "danger-full-access":
      return "full-access";
  }
}

export function mapAccessModeToSandboxMode(accessMode: CodexAccessMode): CodexSandboxMode {
  switch (accessMode) {
    case "read-only":
      return "read-only";
    case "workspace-write":
      return "workspace-write";
    case "full-access":
      return "danger-full-access";
  }
}

export function resolveCodexAccessMode(pluginConfig: Record<string, unknown>): CodexAccessMode {
  const explicitAccessMode = readEnumString(pluginConfig.accessMode, CODEX_ACCESS_MODES);
  if (explicitAccessMode) {
    return explicitAccessMode;
  }

  const legacySandboxMode = readEnumString(pluginConfig.sandboxMode, LEGACY_CODEX_SANDBOX_MODES);
  if (legacySandboxMode) {
    return mapLegacySandboxModeToAccessMode(legacySandboxMode);
  }

  return DEFAULT_CODEX_ACCESS_MODE;
}
