import { app, BrowserWindow, dialog } from "electron";
import { join } from "node:path";
import { RuntimeConfigResolver } from "./runtime-config";
import { RuntimeServiceProcess } from "./runtime-service";
import { DesktopUpdater } from "./updater";

const logger = {
  info: (message: string) => console.log(`[desktop] ${message}`),
  warn: (message: string) => console.warn(`[desktop] ${message}`),
  error: (message: string) => console.error(`[desktop] ${message}`)
};

class DesktopApplication {
  private readonly updater = new DesktopUpdater(logger);
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
      this.updater.stop();
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
    this.updater.start();
    if (!loaded) {
      app.quit();
    }
  }

  private async bootstrapRuntimeAndWindow(): Promise<boolean> {
    try {
      const runtimeCommand = new RuntimeConfigResolver().resolveCommand();
      const runtime = new RuntimeServiceProcess({
        logger,
        scriptPath: runtimeCommand.scriptPath,
        mode: app.isPackaged ? "managed-service" : "embedded-serve"
      });
      const { baseUrl } = await runtime.start();
      this.runtime = runtime;
      this.window = this.createWindow();
      await this.window.loadURL(baseUrl);
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
