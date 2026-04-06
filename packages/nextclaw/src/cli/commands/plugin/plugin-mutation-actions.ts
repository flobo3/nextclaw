import {
  addPluginLoadPath,
  buildPluginStatusReport,
  disablePluginInConfig,
  enablePluginInConfig,
  installPluginFromNpmSpec,
  installPluginFromPath,
  recordPluginInstall,
  uninstallPlugin,
} from "@nextclaw/openclaw-compat";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expandHome, getWorkspacePath, loadConfig, saveConfig } from "@nextclaw/core";
import { buildReservedPluginLoadOptions } from "./plugin-command-utils.js";
import type { PluginsInstallOptions, PluginsUninstallOptions } from "../types.js";

export type PluginMutationResult = {
  message: string;
};

export type PluginUninstallMutationResult = PluginMutationResult & {
  warnings: string[];
};

function resolveFileNpmSpecToLocalPath(
  raw: string,
): { ok: true; path: string } | { ok: false; error: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("file:")) {
    return null;
  }
  const rest = trimmed.slice("file:".length);
  if (!rest) {
    return { ok: false, error: "unsupported file: spec: missing path" };
  }
  if (rest.startsWith("///")) {
    return { ok: true, path: rest.slice(2) };
  }
  if (rest.startsWith("//localhost/")) {
    return { ok: true, path: rest.slice("//localhost".length) };
  }
  if (rest.startsWith("//")) {
    return {
      ok: false,
      error: 'unsupported file: URL host (expected "file:<path>" or "file:///abs/path")'
    };
  }
  return { ok: true, path: rest };
}

function looksLikePath(raw: string): boolean {
  return (
    raw.startsWith(".") ||
    raw.startsWith("~") ||
    raw.startsWith("/") ||
    raw.endsWith(".ts") ||
    raw.endsWith(".js") ||
    raw.endsWith(".mjs") ||
    raw.endsWith(".cjs") ||
    raw.endsWith(".tgz") ||
    raw.endsWith(".tar.gz") ||
    raw.endsWith(".tar") ||
    raw.endsWith(".zip")
  );
}

function isArchivePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".tgz") || lower.endsWith(".tar.gz") || lower.endsWith(".tar");
}

export async function enablePluginMutation(id: string): Promise<PluginMutationResult> {
  const config = loadConfig();
  const next = enablePluginInConfig(config, id);
  saveConfig(next);
  return {
    message: `Enabled plugin "${id}".`,
  };
}

export async function disablePluginMutation(id: string): Promise<PluginMutationResult> {
  const config = loadConfig();
  const next = disablePluginInConfig(config, id);
  saveConfig(next);
  return {
    message: `Disabled plugin "${id}".`,
  };
}

export async function uninstallPluginMutation(
  id: string,
  opts: PluginsUninstallOptions = {},
): Promise<PluginUninstallMutationResult> {
  const config = loadConfig();
  const workspaceDir = getWorkspacePath(config.agents.defaults.workspace);
  const report = buildPluginStatusReport({
    config,
    workspaceDir,
    ...buildReservedPluginLoadOptions()
  });

  const keepFiles = Boolean(opts.keepFiles || opts.keepConfig);
  const plugin = report.plugins.find((entry) => entry.id === id || entry.name === id);
  const pluginId = plugin?.id ?? id;

  const hasEntry = pluginId in (config.plugins.entries ?? {});
  const hasInstall = pluginId in (config.plugins.installs ?? {});

  if (!hasEntry && !hasInstall) {
    if (plugin) {
      throw new Error(
        `Plugin "${pluginId}" is not managed by plugins config/install records and cannot be uninstalled.`,
      );
    }
    throw new Error(`Plugin not found: ${id}`);
  }

  const result = await uninstallPlugin({
    config,
    pluginId,
    deleteFiles: !keepFiles
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  saveConfig(result.config);

  const removed: string[] = [];
  if (result.actions.entry) {
    removed.push("config entry");
  }
  if (result.actions.install) {
    removed.push("install record");
  }
  if (result.actions.allowlist) {
    removed.push("allowlist");
  }
  if (result.actions.loadPath) {
    removed.push("load path");
  }
  if (result.actions.directory) {
    removed.push("directory");
  }

  return {
    message: `Uninstalled plugin "${pluginId}". Removed: ${removed.length > 0 ? removed.join(", ") : "nothing"}.`,
    warnings: result.warnings,
  };
}

export async function installPluginMutation(
  pathOrSpec: string,
  opts: PluginsInstallOptions = {},
): Promise<PluginMutationResult> {
  const fileSpec = resolveFileNpmSpecToLocalPath(pathOrSpec);
  if (fileSpec && !fileSpec.ok) {
    throw new Error(fileSpec.error);
  }
  const normalized = fileSpec && fileSpec.ok ? fileSpec.path : pathOrSpec;
  const resolved = resolve(expandHome(normalized));
  const config = loadConfig();

  if (existsSync(resolved)) {
    if (opts.link) {
      const probe = await installPluginFromPath({ path: resolved, dryRun: true });
      if (!probe.ok) {
        throw new Error(probe.error);
      }

      let next = addPluginLoadPath(config, resolved);
      next = enablePluginInConfig(next, probe.pluginId);
      next = recordPluginInstall(next, {
        pluginId: probe.pluginId,
        source: "path",
        sourcePath: resolved,
        installPath: resolved,
        version: probe.version
      });

      saveConfig(next);
      return {
        message: `Linked plugin path: ${resolved}`,
      };
    }

    const result = await installPluginFromPath({
      path: resolved,
      logger: {
        info: (message) => console.log(message),
        warn: (message) => console.warn(message)
      }
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    let next = enablePluginInConfig(config, result.pluginId);
    next = recordPluginInstall(next, {
      pluginId: result.pluginId,
      source: isArchivePath(resolved) ? "archive" : "path",
      sourcePath: resolved,
      installPath: result.targetDir,
      version: result.version
    });
    saveConfig(next);
    return {
      message: `Installed plugin: ${result.pluginId}`,
    };
  }

  if (opts.link) {
    throw new Error("`--link` requires a local path.");
  }

  if (looksLikePath(pathOrSpec)) {
    throw new Error(`Path not found: ${resolved}`);
  }

  const result = await installPluginFromNpmSpec({
    spec: pathOrSpec,
    logger: {
      info: (message) => console.log(message),
      warn: (message) => console.warn(message)
    }
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  let next = enablePluginInConfig(config, result.pluginId);
  next = recordPluginInstall(next, {
    pluginId: result.pluginId,
    source: "npm",
    spec: pathOrSpec,
    installPath: result.targetDir,
    version: result.version
  });
  saveConfig(next);
  return {
    message: `Installed plugin: ${result.pluginId}`,
  };
}
