export type DesktopUpdateManifest = {
  channel: string;
  platform: string;
  arch: string;
  latestVersion: string;
  minimumLauncherVersion: string;
  bundleUrl: string;
  bundleSha256: string;
  releaseNotesUrl: string | null;
};

function readRequiredString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${context} missing required string field: ${key}`);
  }
  return value.trim();
}

export class DesktopUpdateManifestReader {
  parse = (input: unknown, context = "desktop update manifest"): DesktopUpdateManifest => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error(`${context} must be an object`);
    }
    const record = input as Record<string, unknown>;
    const releaseNotesUrl =
      typeof record.releaseNotesUrl === "string" && record.releaseNotesUrl.trim() ? record.releaseNotesUrl.trim() : null;

    return {
      channel: readRequiredString(record, "channel", context),
      platform: readRequiredString(record, "platform", context),
      arch: readRequiredString(record, "arch", context),
      latestVersion: readRequiredString(record, "latestVersion", context),
      minimumLauncherVersion: readRequiredString(record, "minimumLauncherVersion", context),
      bundleUrl: readRequiredString(record, "bundleUrl", context),
      bundleSha256: readRequiredString(record, "bundleSha256", context).toLowerCase(),
      releaseNotesUrl
    };
  };
}
