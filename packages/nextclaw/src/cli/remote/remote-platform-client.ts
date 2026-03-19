import { getConfigPath, getDataDir, loadConfig, type Config } from "@nextclaw/core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hostname, platform as readPlatform } from "node:os";
import { resolvePlatformApiBase } from "../commands/platform-api-base.js";
import type { RemoteConnectCommandOptions } from "../types.js";
import { getPackageVersion, isProcessRunning, readServiceState } from "../utils.js";
import type { RemoteStatusStore } from "./remote-status-store.js";

export type RegisteredRemoteDevice = {
  id: string;
  deviceInstallId: string;
  displayName: string;
  platform: string;
  appVersion: string;
  localOrigin: string;
  status: "online" | "offline";
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type RemoteLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type RemoteConnectorRunOptions = RemoteConnectCommandOptions & {
  signal?: AbortSignal;
  mode?: "foreground" | "service";
  autoReconnect?: boolean;
  statusStore?: RemoteStatusStore;
};

export type RemoteRunContext = {
  config: Config;
  platformBase: string;
  token: string;
  localOrigin: string;
  displayName: string;
  deviceInstallId: string;
  autoReconnect: boolean;
};

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(path: string, value: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function maskToken(value: string): string {
  if (value.length <= 12) {
    return "<redacted>";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolveDelay, rejectDelay) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolveDelay();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      rejectDelay(new Error("Remote connector aborted."));
    };
    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

export function redactWsUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    if (token) {
      parsed.searchParams.set("token", maskToken(token));
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export class RemotePlatformClient {
  private readonly remoteDir = join(getDataDir(), "remote");
  private readonly devicePath = join(this.remoteDir, "device.json");

  resolveRunContext(opts: RemoteConnectorRunOptions): RemoteRunContext {
    const { platformBase, token, config } = this.resolvePlatformAccess(opts);
    return {
      config,
      platformBase,
      token,
      localOrigin: this.resolveLocalOrigin(config, opts),
      displayName: this.resolveDisplayName(config, opts),
      deviceInstallId: this.ensureDeviceInstallId(),
      autoReconnect: opts.once ? false : (opts.autoReconnect ?? config.remote.autoReconnect)
    };
  }

  async registerDevice(params: {
    platformBase: string;
    token: string;
    deviceInstallId: string;
    displayName: string;
    localOrigin: string;
  }): Promise<RegisteredRemoteDevice> {
    const response = await fetch(`${params.platformBase}/platform/remote/devices/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${params.token}`
      },
      body: JSON.stringify({
        deviceInstallId: params.deviceInstallId,
        displayName: params.displayName,
        platform: readPlatform(),
        appVersion: getPackageVersion(),
        localOrigin: params.localOrigin
      })
    });
    const payload = await response.json() as { ok?: boolean; data?: { device?: RegisteredRemoteDevice }; error?: { message?: string } };
    if (!response.ok || !payload.ok || !payload.data?.device) {
      throw new Error(payload.error?.message ?? `Failed to register remote device (${response.status}).`);
    }
    return payload.data.device;
  }

  private ensureDeviceInstallId(): string {
    const existing = readJsonFile<{ deviceInstallId?: string }>(this.devicePath);
    if (existing?.deviceInstallId?.trim()) {
      return existing.deviceInstallId.trim();
    }
    const deviceInstallId = crypto.randomUUID();
    ensureDir(this.remoteDir);
    writeJsonFile(this.devicePath, { deviceInstallId });
    return deviceInstallId;
  }

  private resolvePlatformAccess(opts: RemoteConnectCommandOptions): {
    platformBase: string;
    token: string;
    config: Config;
  } {
    const config = loadConfig(getConfigPath());
    const providers = config.providers as Record<string, { apiBase?: string | null; apiKey?: string }>;
    const nextclawProvider = providers.nextclaw;
    const token = typeof nextclawProvider?.apiKey === "string" ? nextclawProvider.apiKey.trim() : "";
    if (!token) {
      throw new Error('NextClaw platform token is missing. Run "nextclaw login" first.');
    }
    const configuredApiBase = normalizeOptionalString(config.remote.platformApiBase)
      ?? (typeof nextclawProvider?.apiBase === "string" ? nextclawProvider.apiBase.trim() : "");
    const rawApiBase = normalizeOptionalString(opts.apiBase) ?? configuredApiBase;
    if (!rawApiBase) {
      throw new Error("Platform API base is missing. Pass --api-base, run nextclaw login, or set remote.platformApiBase.");
    }
    const { platformBase } = resolvePlatformApiBase({
      explicitApiBase: rawApiBase,
      requireConfigured: true
    });
    return { platformBase, token, config };
  }

  private resolveLocalOrigin(config: Config, opts: RemoteConnectCommandOptions): string {
    const explicitOrigin = normalizeOptionalString(opts.localOrigin);
    if (explicitOrigin) {
      return explicitOrigin.replace(/\/$/, "");
    }
    const state = readServiceState();
    if (state && isProcessRunning(state.pid) && Number.isFinite(state.uiPort)) {
      return `http://127.0.0.1:${state.uiPort}`;
    }
    const configuredPort = typeof config.ui?.port === "number" && Number.isFinite(config.ui.port)
      ? config.ui.port
      : 18791;
    return `http://127.0.0.1:${configuredPort}`;
  }

  private resolveDisplayName(config: Config, opts: RemoteConnectCommandOptions): string {
    return normalizeOptionalString(opts.name) ?? normalizeOptionalString(config.remote.deviceName) ?? hostname();
  }
}
