import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DesktopUpdateManifestReader, type DesktopUpdateManifest } from "../utils/update-manifest.utils";
import { compareDesktopVersions } from "../utils/version.utils";
import type { DesktopBundleLayoutStore } from "../stores/bundle-layout.store";

type FetchLike = typeof fetch;

type DesktopUpdateServiceOptions = {
  layout: DesktopBundleLayoutStore;
  channel?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  launcherVersion: string;
  manifestReader?: DesktopUpdateManifestReader;
  fetchImpl?: FetchLike;
  now?: () => number;
};

export type DesktopAvailableUpdate =
  | {
      kind: "bundle-update";
      manifest: DesktopUpdateManifest;
    }
  | {
      kind: "launcher-update-required";
      manifest: DesktopUpdateManifest;
    };

export type DownloadedDesktopBundle = {
  manifest: DesktopUpdateManifest;
  archivePath: string;
  sha256: string;
};

export class DesktopUpdateService {
  private readonly channel: string;
  private readonly platform: NodeJS.Platform;
  private readonly arch: string;
  private readonly launcherVersion: string;
  private readonly manifestReader: DesktopUpdateManifestReader;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;

  constructor(private readonly options: DesktopUpdateServiceOptions) {
    this.channel = options.channel ?? "stable";
    this.platform = options.platform ?? process.platform;
    this.arch = options.arch ?? process.arch;
    this.launcherVersion = options.launcherVersion;
    this.manifestReader = options.manifestReader ?? new DesktopUpdateManifestReader();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  checkForUpdate = async (manifestUrl: string, currentVersion: string | null): Promise<DesktopAvailableUpdate | null> => {
    const manifest = await this.fetchManifest(manifestUrl);
    this.assertManifestTarget(manifest);
    if (compareDesktopVersions(this.launcherVersion, manifest.minimumLauncherVersion) < 0) {
      return {
        kind: "launcher-update-required",
        manifest
      };
    }
    if (currentVersion && compareDesktopVersions(manifest.latestVersion, currentVersion) <= 0) {
      return null;
    }
    return {
      kind: "bundle-update",
      manifest
    };
  };

  downloadBundle = async (manifest: DesktopUpdateManifest): Promise<DownloadedDesktopBundle> => {
    const response = await this.fetchImpl(manifest.bundleUrl);
    if (!response.ok) {
      throw new Error(`bundle download failed with status ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== manifest.bundleSha256) {
      throw new Error(`bundle sha256 mismatch: expected ${manifest.bundleSha256} but got ${sha256}`);
    }

    await this.options.layout.ensureLauncherDirs();
    const archivePath = join(this.options.layout.getStagingDir(), `${manifest.latestVersion}-${this.now()}.bundle`);
    await mkdir(this.options.layout.getStagingDir(), { recursive: true });
    await writeFile(archivePath, bytes);
    const writtenSha256 = createHash("sha256").update(await readFile(archivePath)).digest("hex");
    if (writtenSha256 !== manifest.bundleSha256) {
      throw new Error(`written bundle sha256 mismatch: expected ${manifest.bundleSha256} but got ${writtenSha256}`);
    }

    return {
      manifest,
      archivePath,
      sha256: writtenSha256
    };
  };

  private fetchManifest = async (manifestUrl: string): Promise<DesktopUpdateManifest> => {
    const response = await this.fetchImpl(manifestUrl);
    if (!response.ok) {
      throw new Error(`update manifest request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    return this.manifestReader.parse(payload, manifestUrl);
  };

  private assertManifestTarget = (manifest: DesktopUpdateManifest): void => {
    if (manifest.channel !== this.channel) {
      throw new Error(`update manifest channel mismatch: expected ${this.channel} but got ${manifest.channel}`);
    }
    if (manifest.platform !== this.platform) {
      throw new Error(`update manifest platform mismatch: expected ${this.platform} but got ${manifest.platform}`);
    }
    if (manifest.arch !== this.arch) {
      throw new Error(`update manifest arch mismatch: expected ${this.arch} but got ${manifest.arch}`);
    }
  };
}
