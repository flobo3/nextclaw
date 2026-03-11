import type {
  AgentEngine,
  AgentEngineDirectRequest,
  AgentEngineInboundRequest,
  MessageBus,
  OutboundMessage,
  SessionEvent,
  SessionManager,
} from "@nextclaw/core";
import { buildSkillAugmentedPrompt, readRequestedSkills, toAbortError } from "../utils/index.js";
import type { EndpointStreamEvent } from "../types/stream.js";

export type AgentEndpointTurnInput = {
  prompt: string;
  sessionKey: string;
  channel: string;
  chatId: string;
  model: string;
  metadata: Record<string, unknown>;
  abortSignal?: AbortSignal;
};

export type AgentEndpointPrepareSessionParams = {
  sessionKey: string;
  model: string;
  metadata: Record<string, unknown>;
};

export type AbstractAgentEndpointOptions = {
  bus: MessageBus;
  sessionManager: SessionManager;
};

export abstract class AbstractAgentEndpoint implements AgentEngine {
  abstract readonly kind: string;
  readonly supportsAbort = false;

  constructor(protected readonly options: AbstractAgentEndpointOptions) {}

  async handleInbound(params: AgentEngineInboundRequest): Promise<OutboundMessage | null> {
    const reply = await this.processDirect({
      content: params.message.content,
      sessionKey: params.sessionKey,
      channel: params.message.channel,
      chatId: params.message.chatId,
      metadata: params.message.metadata,
    });
    if (!reply.trim()) {
      return null;
    }
    const outbound: OutboundMessage = {
      channel: params.message.channel,
      chatId: params.message.chatId,
      content: reply,
      media: [],
      metadata: {},
    };
    if (params.publishResponse ?? true) {
      await this.options.bus.publishOutbound(outbound);
    }
    return outbound;
  }

  async processDirect(params: AgentEngineDirectRequest): Promise<string> {
    const sessionKey = typeof params.sessionKey === "string" && params.sessionKey.trim() ? params.sessionKey : "cli:direct";
    const channel = typeof params.channel === "string" && params.channel.trim() ? params.channel : "cli";
    const chatId = typeof params.chatId === "string" && params.chatId.trim() ? params.chatId : "direct";
    const metadata = params.metadata ?? {};
    const model = this.resolveModel(metadata);
    const requestedSkills = readRequestedSkills(metadata);
    const session = this.options.sessionManager.getOrCreate(sessionKey);

    const userExtra: Record<string, unknown> = { channel, chatId };
    if (requestedSkills.length > 0) {
      userExtra.requested_skills = requestedSkills;
    }
    const userEvent = this.options.sessionManager.addMessage(session, "user", params.content, userExtra);
    params.onSessionEvent?.(userEvent);

    await this.prepareSessionState({ sessionKey, model, metadata });
    const prompt = buildSkillAugmentedPrompt({
      userMessage: params.content,
      requestedSkills,
      requestedSkillsContent: this.loadRequestedSkillsContent(requestedSkills),
    });

    const deltaParts: string[] = [];
    let completedReply = "";

    for await (const event of this.executeTurn({
      prompt,
      sessionKey,
      channel,
      chatId,
      model,
      metadata,
      abortSignal: params.abortSignal,
    })) {
      this.handleStreamEvent(event, {
        onDelta: (delta) => {
          if (!delta) {
            return;
          }
          deltaParts.push(delta);
          params.onAssistantDelta?.(delta);
        },
        onSessionEvent: params.onSessionEvent,
        onCompleted: (reply) => {
          if (reply.trim()) {
            completedReply = reply.trim();
          }
        },
      });
    }

    if (params.abortSignal?.aborted) {
      throw toAbortError(params.abortSignal.reason);
    }

    const reply = (completedReply || deltaParts.join("")).trim();
    const assistantEvent = this.options.sessionManager.addMessage(session, "assistant", reply, {
      channel,
      chatId,
    });
    params.onSessionEvent?.(assistantEvent);
    this.options.sessionManager.save(session);
    return reply;
  }

  applyRuntimeConfig(): void {}

  protected abstract resolveModel(metadata: Record<string, unknown>): string;

  protected abstract executeTurn(input: AgentEndpointTurnInput): AsyncIterable<EndpointStreamEvent>;

  protected async prepareSessionState(_params: AgentEndpointPrepareSessionParams): Promise<void> {}

  protected loadRequestedSkillsContent(_requestedSkills: string[]): string {
    return "";
  }

  private handleStreamEvent(
    event: EndpointStreamEvent,
    options: {
      onDelta: (delta: string) => void;
      onSessionEvent?: (event: SessionEvent) => void;
      onCompleted: (reply: string) => void;
    },
  ): void {
    if (event.type === "delta") {
      options.onDelta(event.delta);
      return;
    }
    if (event.type === "session_event") {
      options.onSessionEvent?.(event.event);
      return;
    }
    if (event.type === "completed") {
      options.onCompleted(event.reply);
      return;
    }
    if (event.type === "aborted") {
      throw toAbortError(event.reason);
    }
    if (event.type === "error") {
      throw new Error(event.error);
    }
  }
}
