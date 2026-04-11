import { app, BrowserWindow, dialog } from "electron";
import { join } from "node:path";
import { DesktopBundleLifecycleService } from "./launcher/services/bundle-lifecycle.service";
import { DesktopBundleLayoutStore } from "./launcher/stores/bundle-layout.store";
import { DesktopLauncherStateStore } from "./launcher/stores/launcher-state.store";
import { RuntimeConfigResolver } from "./runtime-config";
import { RuntimeServiceProcess } from "./runtime-service";

const logger = {
  info: (message: string) => console.log(`[desktop] ${message}`),
  warn: (message: string) => console.warn(`[desktop] ${message}`),
  error: (message: string) => console.error(`[desktop] ${message}`)
};

class DesktopApplication {
  private runtime: RuntimeServiceProcess | null = null;
  private window: BrowserWindow | null = null;
  private stopping = false;

  async start(): Promise<void> {
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }

    app.on("second-instance", () => {
      if (this.window) {
        if (this.window.isMinimized()) {
          this.window.restore();
        }
        this.window.focus();
      }
    });

    app.on("window-all-closed", () => {
      app.quit();
    });
    app.on("before-quit", (event) => {
      if (this.stopping) {
        return;
      }
      this.stopping = true;
      event.preventDefault();
      void this.stopRuntime().finally(() => {
        app.quit();
      });
    });

    await app.whenReady();
    const loaded = await this.bootstrapRuntimeAndWindow();
    if (!loaded) {
      app.quit();
    }
  }

  private async bootstrapRuntimeAndWindow(): Promise<boolean> {
    try {
      await this.recoverPendingBundleCandidate();
      const runtimeCommand = new RuntimeConfigResolver().resolveCommand();
      logger.info(`Runtime source: ${runtimeCommand.source}`);
      if (runtimeCommand.source === "bundle") {
        logger.info(`Bundle version: ${runtimeCommand.bundleVersion ?? "unknown"}`);
      } else {
        logger.warn(
          [
            "Desktop started without an active product bundle.",
            "This legacy runtime path is a temporary transition path until bundle-based startup is fully shipped."
          ].join(" ")
        );
      }
      const runtime = new RuntimeServiceProcess({
        logger,
        scriptPath: runtimeCommand.scriptPath,
        mode: app.isPackaged ? "managed-service" : "embedded-serve"
      });
      const { baseUrl } = await runtime.start();
      this.runtime = runtime;
      this.window = this.createWindow();
      await this.window.loadURL(baseUrl);
      if (runtimeCommand.source === "bundle" && runtimeCommand.bundleVersion) {
        await this.markBundleHealthy(runtimeCommand.bundleVersion);
      }
      return true;
    } catch (error) {
      logger.error(`Failed to bootstrap runtime: ${String(error)}`);
      const result = await dialog.showMessageBox({
        type: "error",
        title: "NextClaw Desktop Failed to Start",
        message: "Unable to start local NextClaw runtime.",
        detail: error instanceof Error ? error.message : String(error),
        buttons: ["Open Logs", "Quit"],
        defaultId: 0,
        cancelId: 1
      });
      if (result.response === 0) {
        await app.whenReady();
        const logPath = join(app.getPath("logs"), "main.log");
        this.window = this.createWindow();
        await this.window.loadURL(`data:text/plain,${encodeURIComponent(`Check logs at: ${logPath}`)}`);
        return true;
      }
      await this.stopRuntime();
      return false;
    }
  }

  private async recoverPendingBundleCandidate(): Promise<void> {
    const lifecycle = this.createBundleLifecycle();
    const rollbackResult = await lifecycle.recoverPendingCandidate();
    if (!rollbackResult) {
      return;
    }
    if (rollbackResult.rolledBackTo) {
      logger.warn(
        [
          `Rolled back unconfirmed bundle ${rollbackResult.rolledBackFrom}.`,
          `Launcher restored ${rollbackResult.rolledBackTo} before starting desktop again.`
        ].join(" ")
      );
      return;
    }
    logger.warn(
      [
        `Cleared unconfirmed bundle ${rollbackResult.rolledBackFrom}.`,
        "No known-good bundle was available for rollback."
      ].join(" ")
    );
  }

  private async markBundleHealthy(version: string): Promise<void> {
    await this.createBundleLifecycle().markVersionHealthy(version);
    logger.info(`Bundle version marked healthy: ${version}`);
  }

  private createBundleLifecycle(): DesktopBundleLifecycleService {
    const layout = new DesktopBundleLayoutStore();
    return new DesktopBundleLifecycleService({
      layout,
      stateStore: new DesktopLauncherStateStore(layout.getLauncherStatePath())
    });
  }

  private async stopRuntime(): Promise<void> {
    const runtime = this.runtime;
    this.runtime = null;
    if (!runtime) {
      return;
    }
    try {
      await runtime.stop();
    } catch (error) {
      logger.warn(`Failed to stop runtime cleanly: ${String(error)}`);
    }
  }

  private createWindow(): BrowserWindow {
    const window = new BrowserWindow({
      width: 1360,
      height: 920,
      minWidth: 1080,
      minHeight: 720,
      title: "NextClaw Desktop",
      webPreferences: {
        preload: join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    window.on("closed", () => {
      this.window = null;
    });

    return window;
  }
}

const desktop = new DesktopApplication();
void desktop.start();
