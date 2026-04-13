import type { NcpMessage, NcpSessionStatus, NcpSessionSummary } from "@nextclaw/ncp";

export function createNcpSessionSummary(params: {
  sessionId: string;
  agentId?: string;
  messages: readonly NcpMessage[];
  updatedAt: string;
  status: NcpSessionStatus;
  metadata?: Record<string, unknown>;
}): NcpSessionSummary {
  const { sessionId, agentId, messages, updatedAt, status, metadata } = params;
  return {
    sessionId,
    ...(agentId ? { agentId } : {}),
    messageCount: messages.length,
    updatedAt,
    ...(messages.length > 0
      ? {
          lastMessageAt:
            messages[messages.length - 1]?.timestamp ?? updatedAt,
        }
      : {}),
    status,
    ...(metadata ? { metadata: structuredClone(metadata) } : {}),
  };
}
