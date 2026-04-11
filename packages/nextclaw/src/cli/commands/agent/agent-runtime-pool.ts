import {
  AgentRouteResolver,
  CommandRegistry,
  createAssistantStreamDeltaControlMessage,
  createAssistantStreamResetControlMessage,
  createTypingStopControlMessage,
  parseAgentScopedSessionKey,
  resolveDefaultAgentProfileId,
  type CommandOption,
  type Config,
  type InboundMessage,
  type MessageBus,
  type SessionManager,
} from "@nextclaw/core";
import type { UiNcpAgentHandle } from "../ncp/create-ui-ncp-agent.js";
import { runPromptOverNcp } from "../ncp/runtime/nextclaw-ncp-runner.js";

type SystemSessionUpdatedHandler = (params: {
  sessionKey: string;
  message: InboundMessage;
}) => void;

function normalizeAgentId(value: string | undefined): string {
  const text = (value ?? "").trim().toLowerCase();
  return text || "main";
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

export class GatewayAgentRuntimePool {
  private readonly routeResolver: AgentRouteResolver;
  private running = false;
  private defaultAgentId = "main";
  private onSystemSessionUpdated: SystemSessionUpdatedHandler | null = null;

  constructor(
    private options: {
      bus: MessageBus;
      sessionManager: SessionManager;
      config: Config;
      resolveNcpAgent?: () => UiNcpAgentHandle | null;
    },
  ) {
    this.routeResolver = new AgentRouteResolver(options.config);
    this.rebuild(options.config);
  }

  get primaryAgentId(): string {
    return this.defaultAgentId;
  }

  applyRuntimeConfig(config: Config): void {
    this.options.config = config;
    this.routeResolver.updateConfig(config);
    this.rebuild(config);
  }

  setSystemSessionUpdatedHandler(handler: SystemSessionUpdatedHandler | null): void {
    this.onSystemSessionUpdated = handler;
  }

  async processDirect(params: {
    content: string;
    sessionKey?: string;
    channel?: string;
    chatId?: string;
    attachments?: InboundMessage["attachments"];
    metadata?: Record<string, unknown>;
    agentId?: string;
    abortSignal?: AbortSignal;
    onAssistantDelta?: (delta: string) => void;
  }): Promise<string> {
    const { message, route } = this.resolveDirectRoute({
      content: params.content,
      sessionKey: params.sessionKey,
      channel: params.channel,
      chatId: params.chatId,
      attachments: params.attachments,
      metadata: params.metadata,
      agentId: params.agentId,
    });
    const commandResult = await this.executeDirectCommand(params.content, {
      channel: message.channel,
      chatId: message.chatId,
      sessionKey: route.sessionKey,
    });
    if (commandResult) {
      return commandResult;
    }

    const agent = this.requireNcpAgent("direct dispatch");
    const result = await runPromptOverNcp({
      agent,
      sessionId: route.sessionKey,
      content: params.content,
      attachments: params.attachments,
      metadata: this.buildRunMetadata({
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

  supportsTurnAbort(params: {
    sessionKey?: string;
    channel?: string;
    chatId?: string;
    metadata?: Record<string, unknown>;
    agentId?: string;
  }): { supported: boolean; agentId: string; reason?: string } {
    const { route } = this.resolveDirectRoute({
      content: "",
      sessionKey: params.sessionKey,
      channel: params.channel,
      chatId: params.chatId,
      metadata: params.metadata,
      agentId: params.agentId,
    });
    const agent = this.options.resolveNcpAgent?.() ?? null;
    if (!agent) {
      return {
        supported: false,
        agentId: route.agentId,
        reason: "NCP agent is not ready yet",
      };
    }
    return {
      supported: true,
      agentId: route.agentId,
    };
  }

  async run(): Promise<void> {
    this.running = true;
    while (this.running) {
      const message = await this.options.bus.consumeInbound();
      try {
        const explicitSessionKey = normalizeOptionalString(
          message.metadata.session_key_override,
        );
        const forcedAgentId = normalizeOptionalString(
          message.metadata.target_agent_id,
        );
        const route = this.routeResolver.resolveInbound({
          message,
          forcedAgentId,
          sessionKeyOverride: explicitSessionKey,
        });
        const agent = this.requireNcpAgent("gateway dispatch");
        if (message.channel !== "system") {
          await this.options.bus.publishOutbound(
            createAssistantStreamResetControlMessage(message),
          );
        }
        const result = await runPromptOverNcp({
          agent,
          sessionId: route.sessionKey,
          content: message.content,
          attachments: message.attachments,
          metadata: this.buildRunMetadata({
            message,
            route,
          }),
          onAssistantDelta:
            message.channel !== "system"
              ? (delta) => {
                  if (!delta) {
                    return;
                  }
                  void this.options.bus.publishOutbound(
                    createAssistantStreamDeltaControlMessage(message, delta),
                  );
                }
              : undefined,
          missingCompletedMessageError: `session "${route.sessionKey}" completed without a final assistant message`,
          runErrorMessage: `session "${route.sessionKey}" failed`,
        });

        if (message.channel === "system") {
          this.onSystemSessionUpdated?.({
            sessionKey: route.sessionKey,
            message,
          });
          continue;
        }

        const replyText = result.text.trim();
        if (!replyText) {
          await this.options.bus.publishOutbound(
            createTypingStopControlMessage(message),
          );
          continue;
        }

        await this.options.bus.publishOutbound({
          channel: message.channel,
          chatId: message.chatId,
          content: result.text,
          media: [],
          metadata: this.buildRunMetadata({
            message,
            route,
            metadata: result.completedMessage.metadata,
          }),
        });
      } catch (error) {
        await this.options.bus.publishOutbound({
          channel: message.channel,
          chatId: message.chatId,
          content: `Sorry, I encountered an error: ${formatUserFacingError(error)}`,
          media: [],
          metadata: {},
        });
      }
    }
  }

  private requireNcpAgent(purpose: string): UiNcpAgentHandle {
    const agent = this.options.resolveNcpAgent?.() ?? null;
    if (!agent) {
      throw new Error(`NCP agent is not ready for ${purpose}.`);
    }
    return agent;
  }

  private resolveDirectRoute(params: {
    content: string;
    sessionKey?: string;
    channel?: string;
    chatId?: string;
    attachments?: InboundMessage["attachments"];
    metadata?: Record<string, unknown>;
    agentId?: string;
  }): {
    message: InboundMessage;
    route: ReturnType<AgentRouteResolver["resolveInbound"]>;
  } {
    const message: InboundMessage = {
      channel: params.channel ?? "cli",
      senderId: "user",
      chatId: params.chatId ?? "direct",
      content: params.content,
      timestamp: new Date(),
      attachments: params.attachments ?? [],
      metadata: structuredClone(params.metadata ?? {}),
    };
    const forcedAgentId =
      normalizeOptionalString(params.agentId) ??
      parseAgentScopedSessionKey(params.sessionKey)?.agentId ??
      undefined;
    const route = this.routeResolver.resolveInbound({
      message,
      forcedAgentId,
      sessionKeyOverride: params.sessionKey,
    });
    return {
      message,
      route,
    };
  }

  private buildRunMetadata(params: {
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

  private async executeDirectCommand(
    rawContent: string,
    ctx: { channel: string; chatId: string; sessionKey: string },
  ): Promise<string | null> {
    const trimmed = rawContent.trim();
    if (!trimmed.startsWith("/")) {
      return null;
    }
    const registry = new CommandRegistry(this.options.config, this.options.sessionManager);
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
      const result = await executeText.call(registry, rawContent, {
        channel: ctx.channel,
        chatId: ctx.chatId,
        senderId: "user",
        sessionKey: ctx.sessionKey,
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
    const specs = registry.listSlashCommands();
    const args = parseCommandArgsFromText(commandName, commandTail, specs);
    const result = await registry.execute(commandName, args, {
      channel: ctx.channel,
      chatId: ctx.chatId,
      senderId: "user",
      sessionKey: ctx.sessionKey,
    });
    return result?.content ?? null;
  }

  private rebuild(config: Config): void {
    this.defaultAgentId = normalizeAgentId(resolveDefaultAgentProfileId(config));
  }
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
  for (let i = 0; i < options.length; i += 1) {
    if (cursor >= tokens.length) {
      break;
    }
    const option = options[i];
    const isLastOption = i === options.length - 1;
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
