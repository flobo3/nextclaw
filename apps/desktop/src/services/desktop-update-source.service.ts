import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type DesktopReleaseChannel = "stable" | "beta";

export type GitHubPublishTarget = {
  owner: string;
  repo: string;
};

type DesktopUpdateSourceServiceOptions = {
  isPackaged: boolean;
  appPath: string;
  resourcesPath: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  arch?: string;
  publishTarget: GitHubPublishTarget | null;
};

type PackagedReleaseMetadata = {
  channel: DesktopReleaseChannel;
  releaseTag: string | null;
};

const RELEASE_METADATA_FILE_NAME = "update-release-metadata.json";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeDesktopReleaseChannel(value: string | null | undefined): DesktopReleaseChannel {
  return value?.trim().toLowerCase() === "beta" ? "beta" : "stable";
}

export function getDesktopUpdateManifestAssetName(
  channel: DesktopReleaseChannel,
  platform: NodeJS.Platform,
  arch: string
): string {
  return `manifest-${channel}-${platform}-${arch}.json`;
}

export function getDesktopUpdateChannelManifestUrl(
  publishTarget: GitHubPublishTarget,
  channel: DesktopReleaseChannel,
  platform: NodeJS.Platform,
  arch: string
): string {
  return `https://${publishTarget.owner}.github.io/${publishTarget.repo}/desktop-updates/${channel}/${getDesktopUpdateManifestAssetName(channel, platform, arch)}`;
}

export class DesktopUpdateSourceService {
  private readonly env: NodeJS.ProcessEnv;
  private readonly platform: NodeJS.Platform;
  private readonly arch: string;

  constructor(private readonly options: DesktopUpdateSourceServiceOptions) {
    this.env = options.env ?? process.env;
    this.platform = options.platform ?? process.platform;
    this.arch = options.arch ?? process.arch;
  }

  resolveChannel = (): DesktopReleaseChannel => {
    const envChannel = normalizeOptionalString(this.env.NEXTCLAW_DESKTOP_UPDATE_CHANNEL);
    if (envChannel) {
      return normalizeDesktopReleaseChannel(envChannel);
    }
    return this.readPackagedReleaseMetadata().channel;
  };

  resolveManifestUrl = async (): Promise<string | null> => {
    const explicitManifestUrl = normalizeOptionalString(this.env.NEXTCLAW_DESKTOP_UPDATE_MANIFEST_URL);
    if (explicitManifestUrl) {
      return explicitManifestUrl;
    }
    if (!this.options.isPackaged || !this.options.publishTarget) {
      return null;
    }

    return this.buildChannelManifestUrl(this.options.publishTarget, this.resolveChannel());
  };

  private readPackagedReleaseMetadata = (): PackagedReleaseMetadata => {
    const metadataPath = this.options.isPackaged
      ? join(this.options.resourcesPath, "update", RELEASE_METADATA_FILE_NAME)
      : resolve(this.options.appPath, "build", RELEASE_METADATA_FILE_NAME);
    if (!existsSync(metadataPath)) {
      return {
        channel: "stable",
        releaseTag: null
      };
    }

    const parsed = JSON.parse(readFileSync(metadataPath, "utf8")) as Record<string, unknown>;
    return {
      channel: normalizeDesktopReleaseChannel(normalizeOptionalString(parsed.channel)),
      releaseTag: normalizeOptionalString(parsed.releaseTag)
    };
  };

  private buildChannelManifestUrl = (
    publishTarget: GitHubPublishTarget,
    channel: DesktopReleaseChannel
  ): string => {
    return getDesktopUpdateChannelManifestUrl(publishTarget, channel, this.platform, this.arch);
  };
}
