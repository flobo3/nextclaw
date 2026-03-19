import { APP_NAME } from "@nextclaw/core";
import { isProcessRunning, readServiceState } from "../utils.js";
import type { RemoteCommands } from "../commands/remote.js";
import type {
  RemoteConnectCommandOptions,
  RemoteDoctorCommandOptions,
  RemoteEnableCommandOptions,
  RemoteStatusCommandOptions
} from "../types.js";

export class RemoteRuntimeActions {
  constructor(
    private readonly deps: {
      initAuto: (source: string) => Promise<void>;
      remoteCommands: RemoteCommands;
      restartBackgroundService: (reason: string) => Promise<boolean>;
    }
  ) {}

  async connect(opts: RemoteConnectCommandOptions = {}): Promise<void> {
    await this.deps.remoteCommands.connect(opts);
  }

  async enable(opts: RemoteEnableCommandOptions = {}): Promise<void> {
    await this.deps.initAuto("remote enable");
    const result = this.deps.remoteCommands.enableConfig(opts);
    console.log("✓ Remote access enabled");
    if (result.config.remote.deviceName.trim()) {
      console.log(`Device: ${result.config.remote.deviceName.trim()}`);
    }
    if (result.config.remote.platformApiBase.trim()) {
      console.log(`Platform: ${result.config.remote.platformApiBase.trim()}`);
    }
    if (this.hasRunningManagedService()) {
      await this.deps.restartBackgroundService("remote configuration updated");
      console.log("✓ Applied remote settings to running background service");
      return;
    }
    console.log(`Tip: Run "${APP_NAME} start" to bring the managed remote connector online.`);
  }

  async disable(): Promise<void> {
    const result = this.deps.remoteCommands.disableConfig();
    console.log(result.changed ? "✓ Remote access disabled" : "Remote access was already disabled");
    if (this.hasRunningManagedService()) {
      await this.deps.restartBackgroundService("remote access disabled");
      console.log("✓ Running background service restarted without remote access");
    }
  }

  async status(opts: RemoteStatusCommandOptions = {}): Promise<void> {
    await this.deps.remoteCommands.status(opts);
  }

  async doctor(opts: RemoteDoctorCommandOptions = {}): Promise<void> {
    await this.deps.remoteCommands.doctor(opts);
  }

  private hasRunningManagedService(): boolean {
    const state = readServiceState();
    return Boolean(state && isProcessRunning(state.pid));
  }
}
