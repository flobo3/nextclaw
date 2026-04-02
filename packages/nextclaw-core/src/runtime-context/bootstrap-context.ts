import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "../config/schema.js";

type ContextConfig = Config["agents"]["context"];
type BootstrapContextConfig = ContextConfig["bootstrap"];

export const DEFAULT_BOOTSTRAP_CONTEXT_CONFIG: BootstrapContextConfig = {
  files: ["AGENTS.md", "SOUL.md", "USER.md", "IDENTITY.md", "TOOLS.md", "BOOT.md", "BOOTSTRAP.md", "HEARTBEAT.md"],
  minimalFiles: ["AGENTS.md", "SOUL.md", "TOOLS.md", "IDENTITY.md"],
  heartbeatFiles: ["HEARTBEAT.md"],
  perFileChars: 4000,
  totalChars: 12000,
};

export function resolveBootstrapContextConfig(
  contextConfig?: ContextConfig,
): BootstrapContextConfig {
  return {
    ...DEFAULT_BOOTSTRAP_CONTEXT_CONFIG,
    ...(contextConfig?.bootstrap ?? {}),
  };
}

export function buildWorkspaceProjectContextSection(params: {
  workspace: string;
  hostWorkspace?: string;
  projectRoot?: string | null;
  contextConfig?: ContextConfig;
  sessionKey?: string;
}): string {
  const budget = createBootstrapReadBudget(params.contextConfig);
  const hasExplicitProjectRoot =
    typeof params.projectRoot === "string" && params.projectRoot.trim().length > 0;
  const currentProjectDirectory = params.workspace;
  const hostWorkspace =
    typeof params.hostWorkspace === "string" && params.hostWorkspace.trim().length > 0
      ? params.hostWorkspace.trim()
      : null;
  const hasDistinctHostWorkspace =
    Boolean(hostWorkspace) && hostWorkspace !== currentProjectDirectory;
  const projectBootstrap = loadWorkspaceBootstrapFiles({
    workspace: currentProjectDirectory,
    contextConfig: params.contextConfig,
    sessionKey: params.sessionKey,
    budget,
  });
  const hostBootstrap = hasDistinctHostWorkspace && hostWorkspace
    ? loadWorkspaceBootstrapFiles({
        workspace: hostWorkspace,
        contextConfig: params.contextConfig,
        sessionKey: params.sessionKey,
        budget,
      })
    : "";
  const hasSoulFile = /##\s+SOUL\.md\b/i.test(`${projectBootstrap}\n${hostBootstrap}`);
  const lines = [
    "# Workspace Context",
    "",
    `Current project directory: ${currentProjectDirectory}`,
  ];
  if (hasExplicitProjectRoot) {
    lines.push(
      "This session is explicitly bound to that project directory. Use it as the repo and file-operation context for the work the user is asking you to do.",
    );
  } else {
    lines.push(
      "Use this directory as the repo and file-operation context for the work the user is asking you to do.",
    );
  }
  if (hasDistinctHostWorkspace && hostWorkspace) {
    lines.push(
      `NextClaw host workspace directory: ${hostWorkspace}`,
      "This is the assistant's host workspace for runtime memory, workspace-local skills, and NextClaw-specific bootstrap context.",
      "Both directories are simultaneously relevant: use the current project directory for the user's active project work, and use the NextClaw host workspace for host/runtime awareness.",
    );
  }
  if (hasSoulFile) {
    lines.push(
      "If SOUL.md is present, embody its persona and tone. Avoid stiff, generic replies; follow its guidance unless higher-priority instructions override it.",
    );
  }
  if (projectBootstrap) {
    lines.push(
      "",
      "Current project bootstrap files loaded:",
      "",
      projectBootstrap,
    );
  } else {
    lines.push("", "No bootstrap context files were found in the current project directory.");
  }
  if (hasDistinctHostWorkspace && hostWorkspace) {
    if (hostBootstrap) {
      lines.push(
        "",
        "NextClaw host workspace bootstrap files loaded:",
        "",
        hostBootstrap,
      );
    } else {
      lines.push("", "No bootstrap context files were found in the NextClaw host workspace directory.");
    }
  }
  return lines.join("\n");
}

function loadWorkspaceBootstrapFiles(params: {
  workspace: string;
  contextConfig?: ContextConfig;
  sessionKey?: string;
  budget: BootstrapReadBudget;
}): string {
  const parts: string[] = [];
  const { perFileChars } = resolveBootstrapContextConfig(params.contextConfig);
  const fileList = selectBootstrapFiles(params.contextConfig, params.sessionKey);

  for (const filename of fileList) {
    const filePath = join(params.workspace, filename);
    if (!existsSync(filePath)) {
      continue;
    }

    const raw = readFileSync(filePath, "utf-8").trim();
    if (!raw) {
      continue;
    }

    const perFileLimit = perFileChars > 0 ? perFileChars : raw.length;
    const allowed = Math.min(perFileLimit, params.budget.remaining);
    if (allowed <= 0) {
      break;
    }

    const content = truncateText(raw, allowed);
    parts.push(`## ${filename}\n\n${content}`);
    params.budget.remaining -= content.length;
    if (params.budget.remaining <= 0) {
      break;
    }
  }

  return parts.join("\n\n");
}

type BootstrapReadBudget = {
  remaining: number;
};

function createBootstrapReadBudget(contextConfig?: ContextConfig): BootstrapReadBudget {
  const { totalChars } = resolveBootstrapContextConfig(contextConfig);
  return {
    remaining: totalChars > 0 ? totalChars : Number.POSITIVE_INFINITY,
  };
}

function selectBootstrapFiles(
  contextConfig?: ContextConfig,
  sessionKey?: string,
): string[] {
  const { files, minimalFiles, heartbeatFiles } = resolveBootstrapContextConfig(
    contextConfig,
  );
  if (!sessionKey) {
    return files;
  }
  if (sessionKey === "heartbeat") {
    return dedupeStrings([...minimalFiles, ...heartbeatFiles]);
  }
  if (sessionKey.startsWith("cron:") || sessionKey.startsWith("subagent:")) {
    return minimalFiles;
  }
  return files;
}

function truncateText(text: string, limit: number): string {
  if (limit <= 0 || text.length <= limit) {
    return text;
  }
  const omitted = text.length - limit;
  const suffix = `\n\n...[truncated ${omitted} chars]`;
  if (suffix.length >= limit) {
    return text.slice(0, limit).trimEnd();
  }
  const head = text.slice(0, limit - suffix.length).trimEnd();
  return `${head}${suffix}`;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
