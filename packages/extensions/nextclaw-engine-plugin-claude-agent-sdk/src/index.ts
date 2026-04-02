import { createRequire } from "node:module";
import type {
  Options as ClaudeAgentOptions,
  Query as ClaudeAgentQuery,
} from "@anthropic-ai/claude-agent-sdk";
import {
  getApiBase,
  DEFAULT_RUNTIME_USER_PROMPT_BUILDER,
  getProvider,
  type AgentEngine,
  type AgentEngineDirectRequest,
  type AgentEngineFactoryContext,
  type AgentEngineInboundRequest,
  type Config,
  type MessageBus,
  type OutboundMessage,
  type SessionEvent,
  type SessionManager
} from "@nextclaw/core";
import { ClaudeAgentQueryRunner } from "./claude-agent-query-runner.js";

function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readBoolean(input: Record<string, unknown>, key: string): boolean | undefined {
  const value = input[key];
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function readNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function readRecord(input: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = input[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readStringRecord(input: Record<string, unknown>, key: string): Record<string, string> | undefined {
  const value = readRecord(input, key);
  if (!value) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      continue;
    }
    const normalized = entryValue.trim();
    if (!normalized) {
      continue;
    }
    out[entryKey] = normalized;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function readStringOrNullRecord(
  input: Record<string, unknown>,
  key: string
): Record<string, string | null> | undefined {
  const value = readRecord(input, key);
  if (!value) {
    return undefined;
  }
  const out: Record<string, string | null> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue === "string") {
      out[entryKey] = entryValue.trim();
      continue;
    }
    if (entryValue === null) {
      out[entryKey] = null;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function readStringArray(input: Record<string, unknown>, key: string): string[] | undefined {
  const value = input[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function readPermissionMode(
  input: Record<string, unknown>,
  key: string
): "default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk" | undefined {
  const value = readString(input, key);
  if (
    value === "default" ||
    value === "acceptEdits" ||
    value === "bypassPermissions" ||
    value === "plan" ||
    value === "dontAsk"
  ) {
    return value;
  }
  return undefined;
}

function toAbortError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }
  const message = typeof reason === "string" && reason.trim() ? reason.trim() : "operation aborted";
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function readSettingSources(input: Record<string, unknown>, key: string): Array<"user" | "project" | "local"> | undefined {
  const list = readStringArray(input, key);
  if (!list) {
    return undefined;
  }
  const out: Array<"user" | "project" | "local"> = [];
  for (const entry of list) {
    if (entry === "user" || entry === "project" || entry === "local") {
      out.push(entry);
    }
  }
  return out.length > 0 ? out : undefined;
}

function readExecutable(input: Record<string, unknown>, key: string): "node" | "bun" | "deno" | undefined {
  const value = readString(input, key);
  if (value === "node" || value === "bun" || value === "deno") {
    return value;
  }
  return undefined;
}

function normalizeClaudeModel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes("/")) {
    return trimmed;
  }
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? trimmed;
}

function resolveEngineConfig(config: Config, model: string, engineConfig: Record<string, unknown>) {
  const provider = getProvider(config, model);
  const apiKey = readString(engineConfig, "apiKey") ?? provider?.apiKey ?? undefined;
  const apiBase = readString(engineConfig, "apiBase") ?? getApiBase(config, model) ?? undefined;
  return { apiKey, apiBase };
}

type PluginClaudeAgentSdkEngineOptions = {
  bus: MessageBus;
  sessionManager: SessionManager;
  model: string;
  workspace: string;
  contextConfig?: Config["agents"]["context"];
  apiKey?: string;
  apiBase?: string;
  env?: Record<string, string>;
  baseQueryOptions: Partial<ClaudeAgentOptions>;
  requestTimeoutMs: number;
};

type ClaudeAgentSdkModule = {
  query: (params: { prompt: string; options?: ClaudeAgentOptions }) => ClaudeAgentQuery;
};

type ClaudeAgentLoader = {
  loadClaudeAgentSdkModule: () => Promise<ClaudeAgentSdkModule>;
};

const require = createRequire(import.meta.url);
const claudeAgentLoader = require("../claude-agent-sdk-loader.cjs") as ClaudeAgentLoader;

class PluginClaudeAgentSdkEngine implements AgentEngine {
  readonly kind = "claude-agent-sdk";
  readonly supportsAbort = true;

  private sdkModulePromise: Promise<ClaudeAgentSdkModule> | null = null;
  private sessionIdsByKey = new Map<string, string>();
  private defaultModel: string;
  private readonly queryRunner = new ClaudeAgentQueryRunner(this.sessionIdsByKey);

  constructor(private options: PluginClaudeAgentSdkEngineOptions) {
    this.defaultModel = options.model;
  }

  handleInbound = async (
    params: AgentEngineInboundRequest,
  ): Promise<OutboundMessage | null> => {
    const reply = await this.processDirect({
      content: params.message.content,
      sessionKey: params.sessionKey,
      channel: params.message.channel,
      chatId: params.message.chatId,
      metadata: params.message.metadata
    });
    if (!reply.trim()) {
      return null;
    }
    const outbound: OutboundMessage = {
      channel: params.message.channel,
      chatId: params.message.chatId,
      content: reply,
      media: [],
      metadata: {}
    };
    if (params.publishResponse ?? true) {
      await this.options.bus.publishOutbound(outbound);
    }
    return outbound;
  };

  processDirect = async (params: AgentEngineDirectRequest): Promise<string> => {
    const sessionKey =
      typeof params.sessionKey === "string" && params.sessionKey.trim() ? params.sessionKey : "cli:direct";
    const channel = typeof params.channel === "string" && params.channel.trim() ? params.channel : "cli";
    const chatId = typeof params.chatId === "string" && params.chatId.trim() ? params.chatId : "direct";
    const session = this.options.sessionManager.getOrCreate(sessionKey);
    const modelInput = readString(params.metadata ?? {}, "model") ?? this.defaultModel;
    const model = normalizeClaudeModel(modelInput);
    const runtimeContext = DEFAULT_RUNTIME_USER_PROMPT_BUILDER.buildSessionPromptContext({
      workspace: this.options.workspace,
      contextConfig: this.options.contextConfig,
      sessionKey,
      metadata: params.metadata,
      userMessage: params.content,
    });
    const userExtra: Record<string, unknown> = {
      channel,
      chatId,
      ...runtimeContext.requestedSkills.eventMetadata,
    };
    const userEvent = this.options.sessionManager.addMessage(session, "user", params.content, userExtra);
    params.onSessionEvent?.(userEvent);

    const sdk = await this.getSdkModule();
    const abortController = new AbortController();
    const onExternalAbort = () => {
      if (!abortController.signal.aborted) {
        abortController.abort(params.abortSignal?.reason);
      }
    };
    if (params.abortSignal?.aborted) {
      onExternalAbort();
    } else {
      params.abortSignal?.addEventListener("abort", onExternalAbort, { once: true });
    }
    const timeout = this.createRequestTimeout(abortController);
    const queryOptions = this.buildQueryOptions(
      sessionKey,
      model,
      abortController,
      runtimeContext.projectContext.effectiveWorkspace,
    );

    const query = sdk.query({
      prompt: runtimeContext.prompt,
      options: queryOptions
    });

    try {
      const reply = await this.queryRunner.run({
        query,
        sessionKey,
        session,
        sessionManager: this.options.sessionManager,
        onSessionEvent: params.onSessionEvent,
        onAssistantDelta: params.onAssistantDelta,
      });
      if (abortController.signal.aborted) {
        throw toAbortError(abortController.signal.reason);
      }

      const assistantEvent: SessionEvent = this.options.sessionManager.addMessage(session, "assistant", reply, {
        channel,
        chatId
      });
      params.onSessionEvent?.(assistantEvent);
      this.options.sessionManager.save(session);
      return reply;
    } finally {
      params.abortSignal?.removeEventListener("abort", onExternalAbort);
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      query.close();
    }
  };

  applyRuntimeConfig = (_config: Config): void => {};

  private getSdkModule = async (): Promise<ClaudeAgentSdkModule> => {
    if (!this.sdkModulePromise) {
      this.sdkModulePromise = claudeAgentLoader.loadClaudeAgentSdkModule();
    }
    return this.sdkModulePromise;
  };

  private buildQueryOptions = (
    sessionKey: string,
    model: string,
    abortController: AbortController,
    cwd: string,
  ): ClaudeAgentOptions => {
    const env: Record<string, string | undefined> = {
      ...process.env,
      ...(this.options.env ?? {})
    };
    if (this.options.apiKey) {
      env.ANTHROPIC_API_KEY = this.options.apiKey;
    }
    if (this.options.apiBase) {
      env.ANTHROPIC_BASE_URL = this.options.apiBase;
      env.ANTHROPIC_API_URL = this.options.apiBase;
    }

    const options: ClaudeAgentOptions = {
      ...this.options.baseQueryOptions,
      abortController,
      cwd,
      model,
      env
    };

    const resumeSessionId = this.sessionIdsByKey.get(sessionKey);
    if (resumeSessionId) {
      options.resume = resumeSessionId;
    }

    if (options.permissionMode === "bypassPermissions" && options.allowDangerouslySkipPermissions !== true) {
      options.allowDangerouslySkipPermissions = true;
    }

    return options;
  };

  private createRequestTimeout = (
    abortController: AbortController,
  ): ReturnType<typeof setTimeout> | null => {
    if (this.options.requestTimeoutMs <= 0) {
      return null;
    }
    const timeout = setTimeout(() => {
      abortController.abort();
    }, this.options.requestTimeoutMs);
    timeout.unref?.();
    return timeout;
  };
}

type PluginApi = {
  registerEngine: (factory: (context: AgentEngineFactoryContext) => AgentEngine, opts?: { kind?: string }) => void;
};

type PluginDefinition = {
  id: string;
  name: string;
  description: string;
  configSchema: Record<string, unknown>;
  register: (api: PluginApi) => void;
};

const plugin: PluginDefinition = {
  id: "nextclaw-engine-claude-agent-sdk",
  name: "NextClaw Claude Agent SDK Engine",
  description: "Registers engine kind `claude-agent-sdk` backed by Anthropic Claude Agent SDK.",
  configSchema: {
    type: "object",
    additionalProperties: true,
    properties: {}
  },
  register(api) {
    api.registerEngine(
      (context) => {
        const engineConfig = context.engineConfig ?? {};
        const modelInput = readString(engineConfig, "model") ?? context.model;
        const model = normalizeClaudeModel(modelInput);
        const resolved = resolveEngineConfig(context.config, modelInput, engineConfig);

        const permissionMode = readPermissionMode(engineConfig, "permissionMode") ?? "bypassPermissions";
        const allowDangerouslySkipPermissions = readBoolean(engineConfig, "allowDangerouslySkipPermissions");
        const includePartialMessages = readBoolean(engineConfig, "includePartialMessages") ?? true;
        const maxTurns = readNumber(engineConfig, "maxTurns") ?? context.maxIterations;
        const maxThinkingTokens = readNumber(engineConfig, "maxThinkingTokens");
        const requestTimeoutMs = Math.max(0, Math.trunc(readNumber(engineConfig, "requestTimeoutMs") ?? 0));

        const baseQueryOptions: Partial<ClaudeAgentOptions> = {
          permissionMode,
          includePartialMessages,
          maxTurns,
          additionalDirectories: readStringArray(engineConfig, "additionalDirectories"),
          allowedTools: readStringArray(engineConfig, "allowedTools"),
          disallowedTools: readStringArray(engineConfig, "disallowedTools"),
          settingSources: readSettingSources(engineConfig, "settingSources"),
          pathToClaudeCodeExecutable:
            readString(engineConfig, "pathToClaudeCodeExecutable") ?? readString(engineConfig, "claudeCodePath"),
          executable: readExecutable(engineConfig, "executable"),
          executableArgs: readStringArray(engineConfig, "executableArgs"),
          extraArgs: readStringOrNullRecord(engineConfig, "extraArgs"),
          sandbox: readRecord(engineConfig, "sandbox") as ClaudeAgentOptions["sandbox"],
          persistSession: readBoolean(engineConfig, "persistSession"),
          continue: readBoolean(engineConfig, "continue"),
          ...(typeof maxThinkingTokens === "number" ? { maxThinkingTokens } : {})
        };

        if (typeof allowDangerouslySkipPermissions === "boolean") {
          baseQueryOptions.allowDangerouslySkipPermissions = allowDangerouslySkipPermissions;
        }

        return new PluginClaudeAgentSdkEngine({
          bus: context.bus,
          sessionManager: context.sessionManager,
          model,
          workspace: readString(engineConfig, "workingDirectory") ?? context.workspace,
          contextConfig: context.config.agents.context,
          apiKey: resolved.apiKey,
          apiBase: resolved.apiBase,
          env: readStringRecord(engineConfig, "env"),
          baseQueryOptions,
          requestTimeoutMs
        });
      },
      { kind: "claude-agent-sdk" }
    );
  }
};

export default plugin;
