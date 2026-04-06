import type { DefaultNcpAgentBackend } from "@nextclaw/ncp-toolkit";
import type {
  SessionRequestAwaitMode,
  SessionRequestDeliveryMode,
  SessionRequestRecord,
} from "./session-request.types.js";

export type SpawnChildSessionAndRequestParams = {
  sourceSessionId: string;
  sourceToolCallId?: string;
  sourceSessionMetadata: Record<string, unknown>;
  task: string;
  title?: string;
  model?: string;
  handoffDepth?: number;
  sessionType?: string;
  thinkingLevel?: string;
  projectRoot?: string | null;
  agentId?: string;
};

export type RequestSessionParams = {
  sourceSessionId: string;
  sourceToolCallId?: string;
  targetSessionId: string;
  task: string;
  title?: string;
  awaitMode: SessionRequestAwaitMode;
  deliveryMode: SessionRequestDeliveryMode;
  handoffDepth?: number;
};

export type DispatchRequestParams = {
  requestId: string;
  sourceSessionId: string;
  sourceToolCallId?: string;
  targetSessionId: string;
  task: string;
  title: string;
  handoffDepth: number;
  awaitMode: SessionRequestAwaitMode;
  deliveryMode: SessionRequestDeliveryMode;
  agentId?: string;
  isChildSession: boolean;
  parentSessionId?: string;
  spawnedByRequestId?: string;
};

export type SessionRequestExecutionParams = {
  request: SessionRequestRecord;
  task: string;
  title: string;
  agentId?: string;
  isChildSession: boolean;
  parentSessionId?: string;
  spawnedByRequestId?: string;
};

export type StreamCompletedMessageParams = {
  backend: DefaultNcpAgentBackend;
  request: SessionRequestRecord;
  task: string;
};

export type ResolveCompletedMessageParams = Pick<
  SessionRequestExecutionParams,
  "request" | "task"
>;

export type PublishRequestOutcomeParams = SessionRequestExecutionParams;
