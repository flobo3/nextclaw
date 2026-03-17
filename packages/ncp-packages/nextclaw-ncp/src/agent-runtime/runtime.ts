import type { NcpEndpointEvent } from "../types/events.js";
import type { NcpMessage } from "../types/message.js";

export type NcpAgentRunInput = {
  sessionId: string;
  messages: ReadonlyArray<NcpMessage>;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type NcpAgentRunOptions = {
  signal?: AbortSignal;
};

export interface NcpAgentRuntime {
  run(
    input: NcpAgentRunInput,
    options?: NcpAgentRunOptions,
  ): AsyncIterable<NcpEndpointEvent>;
}
