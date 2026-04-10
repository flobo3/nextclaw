import type { Config } from "@nextclaw/core";
import { isProcessRunning } from "../utils.js";
import {
  type LocalUiRuntimeState,
  LocalUiRuntimeStore,
  localUiRuntimeStore
} from "./local-ui-runtime.store.js";
import {
  type ManagedServiceState,
  ManagedServiceStateStore,
  managedServiceStateStore
} from "./managed-service-state.store.js";

type DiscoveredLocalUiState = LocalUiRuntimeState | ManagedServiceState;

export class LocalUiDiscoveryService {
  constructor(
    private readonly localUiStore: LocalUiRuntimeStore = localUiRuntimeStore,
    private readonly managedServiceStore: ManagedServiceStateStore = managedServiceStateStore,
    private readonly isProcessRunningFn: (pid: number) => boolean = (pid) => isProcessRunning(pid)
  ) {}

  private readonly readRunningState = (state: DiscoveredLocalUiState | null): DiscoveredLocalUiState | null => {
    if (!state || !this.isProcessRunningFn(state.pid)) {
      return null;
    }
    return state;
  };

  readonly readRunningRuntimeState = (): DiscoveredLocalUiState | null => {
    return this.readRunningState(this.localUiStore.read()) ?? this.readRunningState(this.managedServiceStore.read());
  };

  readonly readKnownRuntimeState = (): DiscoveredLocalUiState | null => {
    return this.readRunningRuntimeState() ?? this.localUiStore.read() ?? this.managedServiceStore.read();
  };

  readonly resolveApiBase = (): string | null => {
    const state = this.readRunningRuntimeState();
    if (!state) {
      return null;
    }
    if (typeof state.uiUrl === "string" && state.uiUrl.trim().length > 0) {
      return state.uiUrl.replace(/\/+$/, "");
    }
    if (typeof state.apiUrl === "string" && state.apiUrl.trim().length > 0) {
      return state.apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    }
    return null;
  };

  readonly resolveLocalOrigin = (config: Config): string => {
    const state = this.readRunningRuntimeState();
    if (state && Number.isFinite(state.uiPort)) {
      return `http://127.0.0.1:${state.uiPort}`;
    }
    const port = typeof config.ui.port === "number" && Number.isFinite(config.ui.port) ? config.ui.port : 55667;
    return `http://127.0.0.1:${port}`;
  };
}

export const localUiDiscoveryService = new LocalUiDiscoveryService();
