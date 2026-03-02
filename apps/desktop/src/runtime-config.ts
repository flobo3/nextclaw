import { app } from "electron";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type RuntimeCommand = {
  scriptPath: string;
};

export class RuntimeConfigResolver {
  resolveCommand(): RuntimeCommand {
    const envScript = process.env.NEXTCLAW_DESKTOP_RUNTIME_SCRIPT?.trim();
    if (envScript) {
      return {
        scriptPath: envScript
      };
    }

    const appPath = app.getAppPath();
    const candidates = [
      resolve(appPath, "node_modules", "nextclaw", "dist", "cli", "index.js"),
      resolve(appPath, "..", "app.asar.unpacked", "node_modules", "nextclaw", "dist", "cli", "index.js"),
      resolve(appPath, "..", "..", "packages", "nextclaw", "dist", "cli", "index.js")
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return {
          scriptPath: candidate
        };
      }
    }

    throw new Error(
      [
        "Unable to locate nextclaw runtime script.",
        "Build nextclaw first or set NEXTCLAW_DESKTOP_RUNTIME_SCRIPT."
      ].join(" ")
    );
  }
}
