import type { SessionEvent } from "@nextclaw/core";
import type { NcpErrorCode } from "./errors.js";

export type EndpointStreamDeltaEvent = {
  type: "delta";
  delta: string;
};

export type EndpointStreamSessionEvent = {
  type: "session_event";
  event: SessionEvent;
};

export type EndpointStreamCompletedEvent = {
  type: "completed";
  reply: string;
  metadata?: Record<string, unknown>;
};

export type EndpointStreamErrorEvent = {
  type: "error";
  error: string;
  code?: NcpErrorCode;
};

export type EndpointStreamAbortedEvent = {
  type: "aborted";
  reason?: string;
};

export type EndpointStreamEvent =
  | EndpointStreamDeltaEvent
  | EndpointStreamSessionEvent
  | EndpointStreamCompletedEvent
  | EndpointStreamErrorEvent
  | EndpointStreamAbortedEvent;
