import type { Thread, ThreadEvent } from "@openai/codex-sdk";
import type { Session, SessionEvent, SessionManager } from "@nextclaw/core";

type AssistantDeltaHandler = ((delta: string) => void) | undefined;
type SessionEventHandler = ((event: SessionEvent) => void) | undefined;

export class CodexThreadStreamCollector {
  collect = async (params: {
    thread: Thread;
    prompt: string;
    abortSignal?: AbortSignal;
    session: Session;
    sessionManager: SessionManager;
    onSessionEvent?: SessionEventHandler;
    onAssistantDelta?: AssistantDeltaHandler;
  }): Promise<string> => {
    const streamed = await params.thread.runStreamed(params.prompt, {
      ...(params.abortSignal ? { signal: params.abortSignal } : {}),
    });
    const itemTextById = new Map<string, string>();
    const completedAgentMessages: string[] = [];

    for await (const event of streamed.events) {
      const streamEvent = params.sessionManager.appendEvent(params.session, {
        type: `engine.codex.${event.type}`,
        data: { event },
        timestamp: new Date().toISOString(),
      });
      params.onSessionEvent?.(streamEvent);

      this.emitAssistantDelta(event, itemTextById, params.onAssistantDelta);
      if (event.type === "item.completed" && event.item.type === "agent_message") {
        const text = event.item.text.trim();
        if (text) {
          completedAgentMessages.push(text);
        }
      }
      if (event.type === "turn.failed") {
        throw new Error(event.error.message);
      }
      if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    return completedAgentMessages.join("\n").trim();
  };

  private emitAssistantDelta = (
    event: ThreadEvent,
    itemTextById: Map<string, string>,
    onAssistantDelta: AssistantDeltaHandler,
  ): void => {
    if (!onAssistantDelta) {
      return;
    }
    if (event.type !== "item.updated" && event.type !== "item.completed") {
      return;
    }
    if (event.item.type !== "agent_message") {
      return;
    }
    const current = event.item.text ?? "";
    const previous = itemTextById.get(event.item.id) ?? "";
    if (current.length <= previous.length) {
      itemTextById.set(event.item.id, current);
      return;
    }
    const delta = current.slice(previous.length);
    if (delta) {
      onAssistantDelta(delta);
    }
    itemTextById.set(event.item.id, current);
  };
}
