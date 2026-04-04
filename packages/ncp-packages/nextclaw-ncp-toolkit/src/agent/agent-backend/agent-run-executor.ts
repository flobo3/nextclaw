import {
  type NcpEndpointEvent,
  type NcpRequestEnvelope,
  isHiddenNcpMessage,
} from "@nextclaw/ncp";
import { NcpEventType } from "@nextclaw/ncp";
import type { LiveSessionState } from "./agent-backend-types.js";

export class AgentRunExecutor {
  async *executeRun(
    session: LiveSessionState,
    envelope: NcpRequestEnvelope,
    controller: AbortController,
  ): AsyncGenerator<NcpEndpointEvent> {
    if (!isHiddenNcpMessage(envelope.message)) {
      const messageSent: NcpEndpointEvent = {
        type: NcpEventType.MessageSent,
        payload: {
          sessionId: envelope.sessionId,
          message: structuredClone(envelope.message),
          metadata: envelope.metadata,
        },
      };
      await session.stateManager.dispatch(messageSent);
      yield structuredClone(messageSent);
    }

    try {
      for await (const event of session.runtime.run(
        {
          sessionId: envelope.sessionId,
          messages: [envelope.message],
          correlationId: envelope.correlationId,
          metadata: envelope.metadata,
        },
        { signal: controller.signal },
      )) {
        yield structuredClone(event);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const runErrorEvent = await this.publishFailure(
          error,
          envelope,
          session,
        );
        yield structuredClone(runErrorEvent);
      }
    }
  }

  private async publishFailure(
    error: unknown,
    envelope: NcpRequestEnvelope,
    session: LiveSessionState,
  ): Promise<NcpEndpointEvent> {
    const message = error instanceof Error ? error.message : String(error);
    const runErrorEvent: NcpEndpointEvent = {
      type: NcpEventType.RunError,
      payload: {
        sessionId: envelope.sessionId,
        error: message,
      },
    };

    await session.stateManager.dispatch(runErrorEvent);
    return runErrorEvent;
  }
}
