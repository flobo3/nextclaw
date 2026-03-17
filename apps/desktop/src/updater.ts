import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

type UpdateLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export class DesktopUpdater {
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(private readonly logger: UpdateLogger) {}

  start(): void {
    if (!app.isPackaged) {
      this.logger.info("Updater disabled in development mode.");
      return;
    }
    if (!this.hasUpdateMetadata()) {
      this.logger.info("Updater disabled because app-update.yml is missing.");
      return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("checking-for-update", () => {
      this.logger.info("Checking for updates.");
    });
    autoUpdater.on("update-available", (info) => {
      this.logger.info(`Update available: ${info.version}`);
    });
    autoUpdater.on("update-not-available", () => {
      this.logger.info("No update available.");
    });
    autoUpdater.on("error", (error) => {
      this.logger.error(`Updater error: ${error.message}`);
    });
    autoUpdater.on("update-downloaded", async (info) => {
      this.logger.info(`Update downloaded: ${info.version}`);
      const result = await dialog.showMessageBox({
        type: "info",
        buttons: ["Restart and Install", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update Ready",
        message: "A new version is ready.",
        detail: "Restart NextClaw Desktop now to finish installing the update."
      });
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });

    this.triggerUpdateCheck();
    this.intervalHandle = setInterval(() => {
      this.triggerUpdateCheck();
    }, 60 * 60 * 1000);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private hasUpdateMetadata(): boolean {
    return existsSync(join(process.resourcesPath, "app-update.yml"));
  }

  private triggerUpdateCheck(): void {
    void autoUpdater.checkForUpdates().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Updater check skipped: ${message}`);
    });
  }
}
