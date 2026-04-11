import {
  AgentRouteResolver,
  CommandRegistry,
  createAssistantStreamDeltaControlMessage,
  createAssistantStreamResetControlMessage,
  createTypingStopControlMessage,
  parseAgentScopedSessionKey,
  type CommandOption,
  type Config,
  type InboundAttachment,
  type InboundMessage,
  type MessageBus,
  type SessionManager,
} from "@nextclaw/core";
import { runPromptOverNcp, type NcpRunnerAgent } from "./nextclaw-ncp-runner.js";
export type DirectPromptDispatchParams = {
  config: Config;
  sessionManager: SessionManager;
  resolveNcpAgent?: () => NcpRunnerAgent | null;
  content: string;
  sessionKey?: string;
  channel?: string;
  chatId?: string;
  attachments?: InboundAttachment[];
  metadata?: Record<string, unknown>;
  agentId?: string;
  abortSignal?: AbortSignal;
  onAssistantDelta?: (delta: string) => void;
};

export type GatewayInboundLoopParams = {
  bus: MessageBus;
  sessionManager: SessionManager;
  getConfig: () => Config;
  resolveNcpAgent?: () => NcpRunnerAgent | null;
  onSystemSessionUpdated?: (params: {
    sessionKey: string;
    message: InboundMessage;
  }) => void;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function requireNcpAgent(
  resolveNcpAgent: (() => NcpRunnerAgent | null) | undefined,
  purpose: string,
): NcpRunnerAgent {
  const agent = resolveNcpAgent?.() ?? null;
  if (!agent) {
    throw new Error(`NCP agent is not ready for ${purpose}.`);
  }
  return agent;
}

function createDirectInboundMessage(params: {
  content: string;
  channel?: string;
  chatId?: string;
  attachments?: InboundAttachment[];
  metadata?: Record<string, unknown>;
}): InboundMessage {
  return {
    channel: params.channel ?? "cli",
    senderId: "user",
    chatId: params.chatId ?? "direct",
    content: params.content,
    timestamp: new Date(),
    attachments: params.attachments ?? [],
    metadata: structuredClone(params.metadata ?? {}),
  };
}

function buildRunMetadata(params: {
  message: Pick<InboundMessage, "channel" | "chatId" | "metadata" | "senderId">;
  route: ReturnType<AgentRouteResolver["resolveInbound"]>;
  metadata?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(params.message.metadata ?? {}),
    ...(params.metadata ?? {}),
    channel: params.message.channel,
    chatId: params.message.chatId,
    chat_id: params.message.chatId,
    accountId: params.route.accountId,
    account_id: params.route.accountId,
    agentId: params.route.agentId,
    agent_id: params.route.agentId,
    sessionKey: params.route.sessionKey,
    session_key: params.route.sessionKey,
    senderId: params.message.senderId,
    sender_id: params.message.senderId,
  };
}

function parseCommandOptionValue(
  type: CommandOption["type"],
  rawValue: string,
): string | number | boolean | undefined {
  const value = rawValue.trim();
  if (!value) {
    return undefined;
  }
  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type === "boolean") {
    const lowered = value.toLowerCase();
    if (["1", "true", "yes", "on"].includes(lowered)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(lowered)) {
      return false;
    }
    return undefined;
  }
  return value;
}

function parseCommandArgsFromText(
  commandName: string,
  rawTail: string,
  specs: Array<{ name: string; options?: CommandOption[] }>,
): Record<string, unknown> {
  if (!rawTail) {
    return {};
  }
  const command = specs.find(
    (item) => item.name.trim().toLowerCase() === commandName,
  );
  const options = command?.options;
  if (!options || options.length === 0) {
    return {};
  }

  const tokens = rawTail.split(/\s+/).filter(Boolean);
  const args: Record<string, unknown> = {};
  let cursor = 0;
  for (let index = 0; index < options.length; index += 1) {
    if (cursor >= tokens.length) {
      break;
    }
    const option = options[index];
    const isLastOption = index === options.length - 1;
    const rawValue = isLastOption
      ? tokens.slice(cursor).join(" ")
      : tokens[cursor];
    cursor += isLastOption ? tokens.length - cursor : 1;
    const parsedValue = parseCommandOptionValue(option.type, rawValue);
    if (parsedValue !== undefined) {
      args[option.name] = parsedValue;
    }
  }
  return args;
}

async function executeSlashCommandMaybe(params: {
  config: Config;
  sessionManager: SessionManager;
  rawContent: string;
  channel: string;
  chatId: string;
  sessionKey: string;
}): Promise<string | null> {
  const trimmed = params.rawContent.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  const registry = new CommandRegistry(params.config, params.sessionManager);
  const executeText = (
    registry as CommandRegistry & {
      executeText?: (
        input: string,
        execCtx: {
          channel: string;
          chatId: string;
          senderId: string;
          sessionKey: string;
        },
      ) => Promise<{ content: string } | null>;
    }
  ).executeText;
  if (typeof executeText === "function") {
    const result = await executeText.call(registry, params.rawContent, {
      channel: params.channel,
      chatId: params.chatId,
      senderId: "user",
      sessionKey: params.sessionKey,
    });
    return result?.content ?? null;
  }

  const commandRaw = trimmed.slice(1).trim();
  if (!commandRaw) {
    return null;
  }
  const [nameToken, ...restTokens] = commandRaw.split(/\s+/);
  const commandName = nameToken.trim().toLowerCase();
  if (!commandName) {
    return null;
  }
  const commandTail = restTokens.join(" ").trim();
  const args = parseCommandArgsFromText(
    commandName,
    commandTail,
    registry.listSlashCommands(),
  );
  const result = await registry.execute(commandName, args, {
    channel: params.channel,
    chatId: params.chatId,
    senderId: "user",
    sessionKey: params.sessionKey,
  });
  return result?.content ?? null;
}

function resolveDirectRoute(params: {
  config: Config;
  content: string;
  sessionKey?: string;
  channel?: string;
  chatId?: string;
  attachments?: InboundAttachment[];
  metadata?: Record<string, unknown>;
  agentId?: string;
}): {
  message: InboundMessage;
  route: ReturnType<AgentRouteResolver["resolveInbound"]>;
} {
  const message = createDirectInboundMessage(params);
  const forcedAgentId =
    normalizeOptionalString(params.agentId) ??
    parseAgentScopedSessionKey(params.sessionKey)?.agentId ??
    undefined;
  const routeResolver = new AgentRouteResolver(params.config);
  const route = routeResolver.resolveInbound({
    message,
    forcedAgentId,
    sessionKeyOverride: params.sessionKey,
  });
  return {
    message,
    route,
  };
}

function formatUserFacingError(error: unknown, maxChars = 320): string {
  const raw =
    error instanceof Error
      ? error.message || error.name || "Unknown error"
      : String(error ?? "Unknown error");
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Unknown error";
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

export async function dispatchPromptOverNcp(
  params: DirectPromptDispatchParams,
): Promise<string> {
  const { message, route } = resolveDirectRoute({
    config: params.config,
    content: params.content,
    sessionKey: params.sessionKey,
    channel: params.channel,
    chatId: params.chatId,
    attachments: params.attachments,
    metadata: params.metadata,
    agentId: params.agentId,
  });
  const commandResult = await executeSlashCommandMaybe({
    config: params.config,
    sessionManager: params.sessionManager,
    rawContent: params.content,
    channel: message.channel,
    chatId: message.chatId,
    sessionKey: route.sessionKey,
  });
  if (commandResult) {
    return commandResult;
  }

  const agent = requireNcpAgent(params.resolveNcpAgent, "direct dispatch");
  const result = await runPromptOverNcp({
    agent,
    sessionId: route.sessionKey,
    content: params.content,
    attachments: params.attachments,
    metadata: buildRunMetadata({
      message,
      route,
    }),
    abortSignal: params.abortSignal,
    onAssistantDelta: params.onAssistantDelta,
    missingCompletedMessageError: `session "${route.sessionKey}" completed without a final assistant message`,
    runErrorMessage: `session "${route.sessionKey}" failed`,
  });
  return result.text;
}

export async function runGatewayInboundLoop(
  params: GatewayInboundLoopParams,
): Promise<void> {
  while (true) {
    const message = await params.bus.consumeInbound();
    try {
      const explicitSessionKey = normalizeOptionalString(
        message.metadata.session_key_override,
      );
      const forcedAgentId = normalizeOptionalString(
        message.metadata.target_agent_id,
      );
      const route = new AgentRouteResolver(params.getConfig()).resolveInbound({
        message,
        forcedAgentId,
        sessionKeyOverride: explicitSessionKey,
      });
      const agent = requireNcpAgent(
        params.resolveNcpAgent,
        "gateway dispatch",
      );
      if (message.channel !== "system") {
        await params.bus.publishOutbound(
          createAssistantStreamResetControlMessage(message),
        );
      }
      const result = await runPromptOverNcp({
        agent,
        sessionId: route.sessionKey,
        content: message.content,
        attachments: message.attachments,
        metadata: buildRunMetadata({
          message,
          route,
        }),
        onAssistantDelta:
          message.channel !== "system"
            ? (delta) => {
                if (!delta) {
                  return;
                }
                void params.bus.publishOutbound(
                  createAssistantStreamDeltaControlMessage(message, delta),
                );
              }
            : undefined,
        missingCompletedMessageError: `session "${route.sessionKey}" completed without a final assistant message`,
        runErrorMessage: `session "${route.sessionKey}" failed`,
      });

      if (message.channel === "system") {
        params.onSystemSessionUpdated?.({
          sessionKey: route.sessionKey,
          message,
        });
        continue;
      }

      const replyText = result.text.trim();
      if (!replyText) {
        await params.bus.publishOutbound(
          createTypingStopControlMessage(message),
        );
        continue;
      }

      await params.bus.publishOutbound({
        channel: message.channel,
        chatId: message.chatId,
        content: result.text,
        media: [],
        metadata: buildRunMetadata({
          message,
          route,
          metadata: result.completedMessage.metadata,
        }),
      });
    } catch (error) {
      await params.bus.publishOutbound({
        channel: message.channel,
        chatId: message.chatId,
        content: `Sorry, I encountered an error: ${formatUserFacingError(error)}`,
        media: [],
        metadata: {},
      });
    }
  }
}
