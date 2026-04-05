import { expandHome, getWorkspacePath } from "@nextclaw/core";

export function resolveSkillsInstallWorkdir(params: {
  explicitWorkdir?: string;
  configuredWorkspace?: string;
}): string {
  if (params.explicitWorkdir) {
    return expandHome(params.explicitWorkdir);
  }
  return getWorkspacePath(params.configuredWorkspace);
}

export function parseStartTimeoutMs(value: string | number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error("Invalid --start-timeout value. Provide milliseconds (e.g. 45000).");
    process.exit(1);
  }
  return Math.floor(parsed);
}
