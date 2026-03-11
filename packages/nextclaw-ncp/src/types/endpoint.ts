import type { NcpError } from "./errors.js";
import type { EndpointManifest } from "./manifest.js";
import type { NcpMessage } from "./message.js";

export type OutboundEnvelope = {
  sessionKey: string;
  message: NcpMessage;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type InboundEnvelope = {
  sessionKey: string;
  message: NcpMessage;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type MessageDeltaEnvelope = {
  sessionKey: string;
  messageId: string;
  delta: string;
  metadata?: Record<string, unknown>;
};

export type CompletedEnvelope = {
  sessionKey: string;
  message: NcpMessage;
  metadata?: Record<string, unknown>;
};

export type FailedEnvelope = {
  sessionKey: string;
  messageId?: string;
  error: NcpError;
  metadata?: Record<string, unknown>;
};

export type SendReceipt = {
  accepted: boolean;
  messageId: string;
  transportId?: string;
};

export type EndpointEvent =
  | { type: "endpoint.ready" }
  | { type: "message.received"; payload: InboundEnvelope }
  | { type: "message.delta"; payload: MessageDeltaEnvelope }
  | { type: "message.completed"; payload: CompletedEnvelope }
  | { type: "message.failed"; payload: FailedEnvelope }
  | { type: "endpoint.error"; payload: NcpError };

export type EndpointSubscriber = (event: EndpointEvent) => void;

export interface Endpoint {
  readonly manifest: EndpointManifest;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(message: OutboundEnvelope): Promise<SendReceipt>;
  subscribe(listener: EndpointSubscriber): () => void;
}
