import { hostname } from "node:os";
import { loadConfig, type Config } from "@nextclaw/core";
import { readServiceState, updateServiceState, type RemoteRuntimeState } from "../utils.js";

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildConfiguredRemoteState(config: Config = loadConfig()): RemoteRuntimeState {
  const remote = config.remote;
  return {
    enabled: Boolean(remote.enabled),
    mode: "service",
    state: remote.enabled ? "disconnected" : "disabled",
    ...(normalizeOptionalString(remote.deviceName) ? { deviceName: normalizeOptionalString(remote.deviceName) } : {}),
    ...(normalizeOptionalString(remote.platformApiBase) ? { platformBase: normalizeOptionalString(remote.platformApiBase) } : {}),
    updatedAt: new Date().toISOString()
  };
}

export function resolveRemoteStatusSnapshot(config: Config = loadConfig()): {
  configuredEnabled: boolean;
  runtime: RemoteRuntimeState | null;
} {
  const serviceState = readServiceState();
  if (serviceState?.remote) {
    return {
      configuredEnabled: Boolean(config.remote.enabled),
      runtime: serviceState.remote
    };
  }

  if (config.remote.enabled) {
    return {
      configuredEnabled: true,
      runtime: {
        ...buildConfiguredRemoteState(config),
        deviceName: normalizeOptionalString(config.remote.deviceName) ?? hostname()
      }
    };
  }

  return {
    configuredEnabled: false,
    runtime: null
  };
}

export class RemoteStatusStore {
  constructor(private mode: RemoteRuntimeState["mode"]) {}

  write(next: Omit<RemoteRuntimeState, "mode" | "updatedAt">): void {
    updateServiceState((state) => ({
      ...state,
      remote: {
        ...state.remote,
        ...next,
        mode: this.mode,
        updatedAt: new Date().toISOString()
      }
    }));
  }
}
