import { app } from "electron";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DesktopBundleService } from "./launcher/services/bundle.service";
import { DesktopBundleLayoutStore } from "./launcher/stores/bundle-layout.store";
import { DesktopLauncherStateStore } from "./launcher/stores/launcher-state.store";

export type RuntimeCommand = {
  scriptPath: string;
  source: "bundle" | "legacy-runtime" | "environment-override";
  bundleVersion?: string;
  bundleDirectory?: string;
};

export class RuntimeConfigResolver {
  resolveCommand = (): RuntimeCommand => {
    const envScript = process.env.NEXTCLAW_DESKTOP_RUNTIME_SCRIPT?.trim();
    if (envScript) {
      return {
        scriptPath: envScript,
        source: "environment-override"
      };
    }

    const bundleRuntime = this.resolveBundleRuntime();
    if (bundleRuntime) {
      return bundleRuntime;
    }

    const legacyRuntime = this.resolveLegacyRuntime();
    if (legacyRuntime) {
      return legacyRuntime;
    }

    throw new Error(
      [
        "Unable to locate nextclaw runtime script.",
        "Provide a current desktop bundle, build nextclaw for development, or set NEXTCLAW_DESKTOP_RUNTIME_SCRIPT."
      ].join(" ")
    );
  };

  private resolveBundleRuntime = (): RuntimeCommand | null => {
    const layout = new DesktopBundleLayoutStore();
    const stateStore = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    const bundleManager = new DesktopBundleService({
      layout,
      stateStore,
      launcherVersion: app.getVersion()
    });
    const resolvedBundle = bundleManager.resolveCurrentBundle();
    if (!resolvedBundle) {
      return null;
    }
    return {
      scriptPath: resolvedBundle.runtimeScriptPath,
      source: "bundle",
      bundleVersion: resolvedBundle.manifest.bundleVersion,
      bundleDirectory: resolvedBundle.bundleDirectory
    };
  };

  private resolveLegacyRuntime = (): RuntimeCommand | null => {
    const appPath = app.getAppPath();
    const packagedCandidates = [
      resolve(appPath, "..", "app.asar.unpacked", "node_modules", "nextclaw", "dist", "cli", "index.js"),
      resolve(appPath, "node_modules", "nextclaw", "dist", "cli", "index.js")
    ];
    const developmentCandidates = [
      resolve(appPath, "..", "..", "packages", "nextclaw", "dist", "cli", "index.js")
    ];
    const candidates = app.isPackaged ? packagedCandidates : [...packagedCandidates, ...developmentCandidates];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return {
          scriptPath: candidate,
          source: "legacy-runtime"
        };
      }
    }
    return null;
  };
}
