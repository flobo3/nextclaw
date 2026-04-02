import type {
  Query as ClaudeAgentQuery,
  SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { Session, SessionEvent, SessionManager } from "@nextclaw/core";

type SessionEventHandler = ((event: SessionEvent) => void) | undefined;
type AssistantDeltaHandler = ((delta: string) => void) | undefined;

export class ClaudeAgentQueryRunner {
  constructor(
    private readonly sessionIdsByKey: Map<string, string>,
  ) {}

  run = async (params: {
    query: ClaudeAgentQuery;
    sessionKey: string;
    session: Session;
    sessionManager: SessionManager;
    onSessionEvent?: SessionEventHandler;
    onAssistantDelta?: AssistantDeltaHandler;
  }): Promise<string> => {
    const assistantMessages: string[] = [];
    let resultReply = "";

    for await (const message of params.query) {
      this.trackSessionId(params.sessionKey, message);

      const streamEvent = params.sessionManager.appendEvent(params.session, {
        type: this.toSessionEventType(message),
        data: { message },
        timestamp: new Date().toISOString(),
      });
      params.onSessionEvent?.(streamEvent);

      const delta = this.extractAssistantDelta(message);
      if (delta) {
        params.onAssistantDelta?.(delta);
      }

      const assistantText = this.extractAssistantText(message);
      if (assistantText) {
        assistantMessages.push(assistantText);
      }

      const result = this.extractResultMessage(message);
      if (!result) {
        continue;
      }
      if (!result.ok) {
        throw new Error(result.error);
      }
      resultReply = result.text;
    }

    return assistantMessages.join("\n").trim() || resultReply.trim();
  };

  private trackSessionId = (sessionKey: string, message: SDKMessage): void => {
    const maybeSessionId =
      message && typeof message === "object" && "session_id" in message ? (message.session_id as unknown) : undefined;
    if (typeof maybeSessionId === "string" && maybeSessionId.trim()) {
      this.sessionIdsByKey.set(sessionKey, maybeSessionId.trim());
    }
  };

  private toSessionEventType = (message: SDKMessage): string => {
    const baseType =
      message && typeof message === "object" && "type" in message && typeof message.type === "string"
        ? message.type
        : "unknown";
    const maybeSubtype =
      message && typeof message === "object" && "subtype" in message ? (message.subtype as unknown) : undefined;
    if (typeof maybeSubtype === "string" && maybeSubtype.trim()) {
      return `engine.claude.${baseType}.${maybeSubtype.trim()}`;
    }
    return `engine.claude.${baseType}`;
  };

  private extractAssistantText = (message: SDKMessage): string => {
    if (message.type !== "assistant") {
      return "";
    }
    const payload = (message as { message?: { content?: unknown } }).message;
    const content = payload?.content;
    if (typeof content === "string") {
      return content.trim();
    }
    if (!Array.isArray(content)) {
      return "";
    }
    return content
      .map((block) => {
        if (!block || typeof block !== "object") {
          return "";
        }
        const candidate = block as { type?: unknown; text?: unknown };
        if (candidate.type !== "text" || typeof candidate.text !== "string") {
          return "";
        }
        return candidate.text;
      })
      .join("")
      .trim();
  };

  private extractAssistantDelta = (message: SDKMessage): string => {
    if (message.type !== "stream_event") {
      return "";
    }
    const event = (message as { event?: unknown }).event;
    if (!event || typeof event !== "object") {
      return "";
    }
    const eventObj = event as { type?: unknown; delta?: unknown; text?: unknown };
    if (eventObj.type === "content_block_delta") {
      const delta = eventObj.delta as { type?: unknown; text?: unknown } | undefined;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        return delta.text;
      }
    }
    if (typeof eventObj.text === "string") {
      return eventObj.text;
    }
    return "";
  };

  private extractResultMessage = (
    message: SDKMessage,
  ): { ok: true; text: string } | { ok: false; error: string } | null => {
    if (message.type !== "result") {
      return null;
    }
    if (message.subtype === "success") {
      return { ok: true, text: typeof message.result === "string" ? message.result : "" };
    }
    const errors = Array.isArray(message.errors)
      ? message.errors.map((entry) => String(entry)).filter(Boolean)
      : [];
    return {
      ok: false,
      error: errors.join("; ") || `claude-agent-sdk execution failed: ${message.subtype}`,
    };
  };
}
