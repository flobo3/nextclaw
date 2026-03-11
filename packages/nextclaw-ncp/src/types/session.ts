import type { NcpMessage } from "./message.js";

export type NcpSessionBinding = {
  endpointId: string;
  sessionKey: string;
  externalSessionId: string;
  metadata?: Record<string, unknown>;
};

export type NcpSessionState = {
  sessionKey: string;
  endpointId: string;
  externalSessionId?: string;
  messageCount: number;
  updatedAt: string;
};

export interface NcpSessionContract {
  resolveBinding(sessionKey: string): Promise<NcpSessionBinding | null>;
  upsertBinding(binding: NcpSessionBinding): Promise<void>;
  appendMessage(message: NcpMessage): Promise<void>;
}
