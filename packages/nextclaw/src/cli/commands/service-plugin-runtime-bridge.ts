import { loadConfig, resolveConfigSecrets, saveConfig, type InboundAttachment, type SessionManager } from "@nextclaw/core";
import { NcpEventType, type NcpEndpointEvent, type NcpMessagePart, type NcpRequestEnvelope } from "@nextclaw/ncp";
import { setPluginRuntimeBridge } from "@nextclaw/openclaw-compat";
import type { getPluginChannelBindings } from "@nextclaw/openclaw-compat";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { GatewayAgentRuntimePool } from "./agent-runtime-pool.js";
import type { UiNcpAgentHandle } from "./ncp/create-ui-ncp-agent.js";
import { mergePluginConfigView, toPluginConfigView } from "./plugins.js";

type InstallPluginRuntimeBridgeParams = {
  runtimePool: GatewayAgentRuntimePool;
  sessionManager: SessionManager;
  runtimeConfigPath: string;
  pluginChannelBindings: ReturnType<typeof getPluginChannelBindings>;
  getUiNcpAgent: () => UiNcpAgentHandle | null;
};

type PluginRuntimeDispatchContext = {
  BodyForAgent?: unknown;
  Body?: unknown;
  SessionKey?: unknown;
  OriginatingChannel?: unknown;
  OriginatingTo?: unknown;
  SenderId?: unknown;
  AccountId?: unknown;
  AgentId?: unknown;
  Model?: unknown;
  AgentModel?: unknown;
  MediaPath?: unknown;
  MediaPaths?: unknown;
  MediaUrl?: unknown;
  MediaUrls?: unknown;
  MediaType?: unknown;
  MediaTypes?: unknown;
};

type ResolvedPluginRuntimeRequest = {
  content: string;
  sessionKey?: string;
  channel: string;
  chatId: string;
  agentId?: string;
  attachments: InboundAttachment[];
  metadata: Record<string, unknown>;
};

const ATTACHMENT_ONLY_FALLBACK_PROMPT = "Please inspect the attached file(s) and respond.";

export function installPluginRuntimeBridge(params: InstallPluginRuntimeBridgeParams): void {
  const { runtimePool, runtimeConfigPath, pluginChannelBindings, sessionManager, getUiNcpAgent } = params;

  setPluginRuntimeBridge({
    loadConfig: () =>
      toPluginConfigView(resolveConfigSecrets(loadConfig(), { configPath: runtimeConfigPath }), pluginChannelBindings),
    writeConfigFile: async (nextConfigView) => {
      if (!nextConfigView || typeof nextConfigView !== "object" || Array.isArray(nextConfigView)) {
        throw new Error("plugin runtime writeConfigFile expects an object config");
      }
      const current = loadConfig();
      const next = mergePluginConfigView(current, nextConfigView, pluginChannelBindings);
      saveConfig(next);
    },
    dispatchReplyWithBufferedBlockDispatcher: async ({ ctx, dispatcherOptions }) => {
      const request = resolvePluginRuntimeRequest(ctx as PluginRuntimeDispatchContext);
      if (!request) {
        return;
      }

      try {
        const replyText = await resolveReplyText({
          request,
          runtimePool,
          sessionManager,
          getUiNcpAgent,
        });
        if (replyText.trim()) {
          await dispatcherOptions.deliver({ text: replyText }, { kind: "final" });
        }
      } catch (error) {
        dispatcherOptions.onError?.(error);
        throw error;
      }
    }
  });
}

async function resolveReplyText(params: {
  request: ResolvedPluginRuntimeRequest;
  runtimePool: GatewayAgentRuntimePool;
  sessionManager: SessionManager;
  getUiNcpAgent: () => UiNcpAgentHandle | null;
}): Promise<string> {
  if (!resolveExistingNcpSessionType(params.sessionManager, params.request.sessionKey)) {
    const response = await params.runtimePool.processDirect(params.request);
    return typeof response === "string" ? response : String(response ?? "");
  }
  const uiNcpAgent = params.getUiNcpAgent();
  if (!uiNcpAgent) {
    throw new Error(
      `Plugin runtime dispatch requires an active UI NCP agent for session '${params.request.sessionKey}', but none is available.`,
    );
  }
  return dispatchViaUiNcpAgent({
    uiNcpAgent,
    request: params.request,
  });
}

function resolvePluginRuntimeRequest(ctx: PluginRuntimeDispatchContext): ResolvedPluginRuntimeRequest | null {
  const attachments = resolvePluginRuntimeAttachments(ctx);
  const bodyForAgent = typeof ctx.BodyForAgent === "string" ? ctx.BodyForAgent : "";
  const body = typeof ctx.Body === "string" ? ctx.Body : "";
  const rawContent = (bodyForAgent || body).trim();
  const content = rawContent || (attachments.length > 0 ? ATTACHMENT_ONLY_FALLBACK_PROMPT : "");
  if (!content && attachments.length === 0) {
    return null;
  }

  const sessionKey = readOptionalString(ctx.SessionKey);
  const channel = readOptionalString(ctx.OriginatingChannel) ?? "cli";
  const chatId = readOptionalString(ctx.OriginatingTo) ?? readOptionalString(ctx.SenderId) ?? "direct";
  const agentId = readOptionalString(ctx.AgentId);
  const modelOverride = resolveModelOverride(ctx);
  const accountId = readOptionalString(ctx.AccountId);

  return {
    content,
    sessionKey,
    channel,
    chatId,
    agentId,
    attachments,
    metadata: {
      ...(accountId ? { account_id: accountId } : {}),
      ...(modelOverride ? { model: modelOverride } : {})
    }
  };
}

function resolveExistingNcpSessionType(
  sessionManager: SessionManager,
  sessionKey: string | undefined,
): string | null {
  if (!sessionKey) {
    return null;
  }
  const session = sessionManager.getIfExists(sessionKey);
  if (!session || !session.metadata || typeof session.metadata !== "object" || Array.isArray(session.metadata)) {
    return null;
  }
  const metadata = session.metadata as Record<string, unknown>;
  return (
    readOptionalString(metadata.session_type) ??
    readOptionalString(metadata.sessionType) ??
    null
  );
}

async function dispatchViaUiNcpAgent(params: {
  uiNcpAgent: UiNcpAgentHandle;
  request: ResolvedPluginRuntimeRequest;
}): Promise<string> {
  const envelope = await buildNcpRequestEnvelope(params.request);
  const events: NcpEndpointEvent[] = [];
  const unsubscribe = params.uiNcpAgent.agentClientEndpoint.subscribe((event) => {
    if (!eventBelongsToSession(event, envelope.sessionId)) {
      return;
    }
    events.push(event);
  });

  try {
    await params.uiNcpAgent.agentClientEndpoint.send(envelope);
  } finally {
    unsubscribe();
  }

  const error = extractNcpDispatchError(events);
  if (error) {
    throw error;
  }
  return extractAssistantReplyText(events);
}

async function buildNcpRequestEnvelope(request: ResolvedPluginRuntimeRequest): Promise<NcpRequestEnvelope> {
  const sessionId = request.sessionKey;
  if (!sessionId) {
    throw new Error("NCP dispatch requires a session key.");
  }
  const parts = await toNcpMessageParts(request);
  const timestamp = new Date().toISOString();
  return {
    sessionId,
    correlationId: randomUUID(),
    metadata: structuredClone(request.metadata),
    message: {
      id: `plugin-runtime-user-${randomUUID()}`,
      sessionId,
      role: "user",
      status: "final",
      timestamp,
      parts,
      metadata: structuredClone(request.metadata),
    },
  };
}

async function toNcpMessageParts(request: ResolvedPluginRuntimeRequest): Promise<NcpMessagePart[]> {
  const parts: NcpMessagePart[] = [];
  if (request.content.trim()) {
    parts.push({
      type: "text",
      text: request.content,
    });
  }
  for (const attachment of request.attachments) {
    parts.push(await materializeAttachmentPart(attachment));
  }
  return parts;
}

async function materializeAttachmentPart(attachment: InboundAttachment): Promise<NcpMessagePart> {
  if (attachment.path) {
    const bytes = await readFile(attachment.path);
    return {
      type: "file",
      name: basename(attachment.path),
      mimeType: attachment.mimeType,
      contentBase64: bytes.toString("base64"),
      sizeBytes: bytes.byteLength,
    };
  }
  if (attachment.url) {
    return {
      type: "file",
      mimeType: attachment.mimeType,
      url: attachment.url,
    };
  }
  throw new Error("Plugin runtime attachment is missing both path and url.");
}

function eventBelongsToSession(event: NcpEndpointEvent, sessionId: string): boolean {
  if (!("payload" in event)) {
    return false;
  }
  const payload = event.payload;
  return Boolean(payload && typeof payload === "object" && "sessionId" in payload && payload.sessionId === sessionId);
}

function extractNcpDispatchError(events: NcpEndpointEvent[]): Error | null {
  for (const event of events) {
    if (event.type === NcpEventType.RunError) {
      return new Error(event.payload.error || "NCP runtime failed.");
    }
    if (event.type === NcpEventType.MessageFailed) {
      return new Error(event.payload.error.message);
    }
  }
  return null;
}

function extractAssistantReplyText(events: NcpEndpointEvent[]): string {
  const textDeltas: string[] = [];
  let completedText = "";
  for (const event of events) {
    if (event.type === NcpEventType.MessageTextDelta) {
      textDeltas.push(event.payload.delta);
      continue;
    }
    if (event.type === NcpEventType.MessageCompleted || event.type === NcpEventType.MessageIncoming) {
      completedText = extractTextParts(event.payload.message.parts);
    }
  }
  const streamed = textDeltas.join("").trim();
  if (streamed) {
    return streamed;
  }
  return completedText.trim();
}

function extractTextParts(parts: NcpMessagePart[]): string {
  return parts
    .filter((part): part is Extract<NcpMessagePart, { type: "text" | "rich-text" }> =>
      part.type === "text" || part.type === "rich-text",
    )
    .map((part) => part.text)
    .join("");
}

function resolveModelOverride(ctx: PluginRuntimeDispatchContext): string | undefined {
  if (typeof ctx.Model === "string" && ctx.Model.trim().length > 0) {
    return ctx.Model.trim();
  }
  if (typeof ctx.AgentModel === "string" && ctx.AgentModel.trim().length > 0) {
    return ctx.AgentModel.trim();
  }
  return undefined;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function resolvePluginRuntimeAttachments(ctx: PluginRuntimeDispatchContext): InboundAttachment[] {
  const mediaPaths = readStringList(ctx.MediaPaths);
  const mediaUrls = readStringList(ctx.MediaUrls);
  const fallbackPath = readOptionalString(ctx.MediaPath);
  const fallbackUrl = readOptionalString(ctx.MediaUrl);
  const mediaTypes = readStringList(ctx.MediaTypes);
  const fallbackType = readOptionalString(ctx.MediaType);
  const entryCount = Math.max(
    mediaPaths.length,
    mediaUrls.length,
    fallbackPath ? 1 : 0,
    fallbackUrl ? 1 : 0,
  );

  const attachments: InboundAttachment[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    const path = mediaPaths[index] ?? (index === 0 ? fallbackPath : undefined);
    const rawUrl = mediaUrls[index] ?? (index === 0 ? fallbackUrl : undefined);
    const url = rawUrl && rawUrl !== path ? rawUrl : undefined;
    const mimeType = mediaTypes[index] ?? fallbackType;
    if (!path && !url) {
      continue;
    }
    attachments.push({
      path,
      url,
      mimeType,
      source: "plugin-runtime",
      status: path ? "ready" : "remote-only",
    });
  }

  return attachments;
}
