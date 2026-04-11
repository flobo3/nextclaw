import {
  AgentRouteResolver,
  MessageBus,
  SessionManager,
  getDataDir,
  parseAgentScopedSessionKey,
  type Config,
  type ProviderManager,
} from "@nextclaw/core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import type { AgentCommandOptions } from "../../types.js";
import { printAgentResponse, prompt } from "../../utils.js";
import { createUiNcpAgent } from "../ncp/create-ui-ncp-agent.js";
import { runPromptOverNcp } from "../ncp/runtime/nextclaw-ncp-runner.js";
import type { NextclawExtensionRegistry } from "../plugins.js";

const EXIT_COMMANDS = new Set(["exit", "quit", "/exit", "/quit", ":q"]);

function buildCliRunMetadata(params: {
  route: ReturnType<AgentRouteResolver["resolveInbound"]>;
  metadata: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...params.metadata,
    channel: "cli",
    chatId: "direct",
    chat_id: "direct",
    accountId: params.route.accountId,
    account_id: params.route.accountId,
    agentId: params.route.agentId,
    agent_id: params.route.agentId,
    sessionKey: params.route.sessionKey,
    session_key: params.route.sessionKey,
    senderId: "user",
    sender_id: "user",
  };
}

async function runCliPromptOverNcp(params: {
  routeResolver: AgentRouteResolver;
  ncpAgent: Awaited<ReturnType<typeof createUiNcpAgent>>;
  sessionKey: string;
  content: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const message = {
    channel: "cli",
    senderId: "user",
    chatId: "direct",
    content: params.content,
    timestamp: new Date(),
    attachments: [],
    metadata: structuredClone(params.metadata),
  };
  const route = params.routeResolver.resolveInbound({
    message,
    forcedAgentId: parseAgentScopedSessionKey(params.sessionKey)?.agentId,
    sessionKeyOverride: params.sessionKey,
  });
  const result = await runPromptOverNcp({
    agent: params.ncpAgent,
    sessionId: route.sessionKey,
    content: params.content,
    metadata: buildCliRunMetadata({
      route,
      metadata: message.metadata,
    }),
    missingCompletedMessageError: `session "${route.sessionKey}" completed without a final assistant message`,
    runErrorMessage: `session "${route.sessionKey}" failed`,
  });
  return result.text;
}

function buildCliSharedMetadata(
  opts: Pick<AgentCommandOptions, "model">,
): Record<string, unknown> {
  return typeof opts.model === "string" && opts.model.trim()
    ? { model: opts.model.trim() }
    : {};
}

function createCliHistoryInterface() {
  const historyFile = join(getDataDir(), "history", "cli_history");
  const historyDir = resolve(historyFile, "..");
  mkdirSync(historyDir, { recursive: true });

  const history = existsSync(historyFile)
    ? readFileSync(historyFile, "utf-8").split("\n").filter(Boolean)
    : [];
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on("close", () => {
    const merged = history.concat(
      (rl as unknown as { history: string[] }).history ?? [],
    );
    writeFileSync(historyFile, merged.join("\n"));
    process.exit(0);
  });

  return rl;
}

async function runCliInteractiveLoop(params: {
  logo: string;
  routeResolver: AgentRouteResolver;
  ncpAgent: Awaited<ReturnType<typeof createUiNcpAgent>>;
  sessionKey: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  console.log(`${params.logo} Interactive mode (type exit or Ctrl+C to quit)\n`);
  const rl = createCliHistoryInterface();

  let running = true;
  while (running) {
    const line = await prompt(rl, "You: ");
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (EXIT_COMMANDS.has(trimmed.toLowerCase())) {
      rl.close();
      running = false;
      break;
    }
    const response = await runCliPromptOverNcp({
      routeResolver: params.routeResolver,
      ncpAgent: params.ncpAgent,
      sessionKey: params.sessionKey,
      content: trimmed,
      metadata: params.metadata,
    });
    printAgentResponse(response);
  }
}

export async function runCliAgentCommand(params: {
  logo: string;
  opts: AgentCommandOptions;
  config: Config;
  workspace: string;
  providerManager: ProviderManager;
  extensionRegistry: NextclawExtensionRegistry;
  loadResolvedConfig: () => Config;
  resolveMessageToolHints: (params: {
    channel: string;
    accountId?: string | null;
  }) => string[];
}): Promise<void> {
  const bus = new MessageBus();
  const sessionManager = new SessionManager({
    workspace: params.workspace,
    homeDir: getDataDir(),
  });
  const routeResolver = new AgentRouteResolver(params.config);
  const ncpAgent = await createUiNcpAgent({
    bus,
    providerManager: params.providerManager,
    sessionManager,
    getConfig: params.loadResolvedConfig,
    getExtensionRegistry: () => params.extensionRegistry,
    resolveMessageToolHints: ({ channel, accountId }) =>
      params.resolveMessageToolHints({ channel, accountId }),
  });

  try {
    const sessionKey = params.opts.session ?? "cli:default";
    const sharedMetadata = buildCliSharedMetadata(params.opts);

    if (params.opts.message) {
      const response = await runCliPromptOverNcp({
        routeResolver,
        ncpAgent,
        sessionKey,
        content: params.opts.message,
        metadata: sharedMetadata,
      });
      printAgentResponse(response);
      return;
    }

    await runCliInteractiveLoop({
      logo: params.logo,
      routeResolver,
      ncpAgent,
      sessionKey,
      metadata: sharedMetadata,
    });
  } finally {
    await ncpAgent.dispose?.();
  }
}
