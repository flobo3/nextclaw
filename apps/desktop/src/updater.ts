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

    void autoUpdater.checkForUpdates();
    this.intervalHandle = setInterval(() => {
      void autoUpdater.checkForUpdates();
    }, 60 * 60 * 1000);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}
