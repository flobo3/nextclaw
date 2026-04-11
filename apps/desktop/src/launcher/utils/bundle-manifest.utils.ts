import { existsSync, readFileSync } from "node:fs";

export type DesktopBundleManifest = {
  bundleVersion: string;
  platform: string;
  arch: string;
  uiVersion: string;
  runtimeVersion: string;
  builtInPluginSetVersion: string;
  launcherCompatibility: {
    minVersion: string;
  };
  entrypoints: {
    runtimeScript: string;
  };
  migrationVersion: number;
};

function readRequiredString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${context} missing required string field: ${key}`);
  }
  return value.trim();
}

function readRequiredObject(record: Record<string, unknown>, key: string, context: string): Record<string, unknown> {
  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context} missing required object field: ${key}`);
  }
  return value as Record<string, unknown>;
}

export class DesktopBundleManifestReader {
  readFile = (filePath: string): DesktopBundleManifest => {
    if (!existsSync(filePath)) {
      throw new Error(`bundle manifest not found: ${filePath}`);
    }
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return this.parse(parsed, filePath);
  };

  parse = (input: unknown, context = "bundle manifest"): DesktopBundleManifest => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error(`${context} must be an object`);
    }
    const record = input as Record<string, unknown>;
    const launcherCompatibility = readRequiredObject(record, "launcherCompatibility", context);
    const entrypoints = readRequiredObject(record, "entrypoints", context);
    const migrationVersion = Number(record.migrationVersion);
    if (!Number.isInteger(migrationVersion) || migrationVersion < 0) {
      throw new Error(`${context} has invalid migrationVersion`);
    }
    return {
      bundleVersion: readRequiredString(record, "bundleVersion", context),
      platform: readRequiredString(record, "platform", context),
      arch: readRequiredString(record, "arch", context),
      uiVersion: readRequiredString(record, "uiVersion", context),
      runtimeVersion: readRequiredString(record, "runtimeVersion", context),
      builtInPluginSetVersion: readRequiredString(record, "builtInPluginSetVersion", context),
      launcherCompatibility: {
        minVersion: readRequiredString(launcherCompatibility, "minVersion", `${context}.launcherCompatibility`)
      },
      entrypoints: {
        runtimeScript: readRequiredString(entrypoints, "runtimeScript", `${context}.entrypoints`)
      },
      migrationVersion
    };
  };
}
