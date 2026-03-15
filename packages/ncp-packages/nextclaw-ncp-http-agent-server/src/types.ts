import type {
  NcpAgentClientEndpoint,
  NcpEndpointEvent,
  NcpStreamRequestPayload,
} from "@nextclaw/ncp";

export const DEFAULT_BASE_PATH = "/ncp/agent";
export const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

/** Filters which events belong to the current request (session/run/correlation). */
export type EventScope = {
  sessionId: string;
  correlationId?: string;
  runId?: string;
};

/**
 * Streams stored session events for `/stream`.
 *
 * **Scenario**: User sends a message, agent streams SSE back. Network drops mid-stream.
 * User reconnects and requests `GET /stream?sessionId=xxx&runId=yyy` to
 * "continue watching the previous reply".
 *
 * **Two paths**:
 * - **Stored stream** (with streamProvider): Do not call agent. Fetch that run's events
 *   (message.accepted, message.text-delta, message.completed, etc.) from persistence
 *   and stream them in order. Use when you have session/event storage and want to
 *   avoid re-running the agent.
 * - **Forward** (no streamProvider): Forward `message.stream-request` to the agent
 *   and let it recover or re-run.
 *
 * **Implementation**: `stream` fetches events by payload.sessionId and payload.runId
 * from your storage and yields them in order.
 */
export type NcpHttpAgentStreamProvider = {
  stream(params: {
    payload: NcpStreamRequestPayload;
    signal: AbortSignal;
  }): AsyncIterable<NcpEndpointEvent>;
};

export type NcpHttpAgentServerOptions = {
  /** Client endpoint to forward requests to (in-process adapter or remote HTTP client). */
  agentClientEndpoint: NcpAgentClientEndpoint;
  basePath?: string;
  requestTimeoutMs?: number;
  /**
   * Optional. When set, `/stream` serves stored events instead of forwarding to the agent.
   * When not set, forwards `message.stream-request` to the agent.
   */
  streamProvider?: NcpHttpAgentStreamProvider;
};

export type SseEventFrame = {
  event: "ncp-event" | "error";
  data: unknown;
};
