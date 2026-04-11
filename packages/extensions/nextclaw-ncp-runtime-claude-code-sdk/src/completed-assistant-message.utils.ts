import type {
  NcpAgentConversationStateManager,
  NcpMessage,
} from "@nextclaw/ncp";

export function buildCompletedAssistantMessage(params: {
  stateManager?: NcpAgentConversationStateManager;
  sessionId: string;
  messageId: string;
}): NcpMessage {
  const { stateManager, sessionId, messageId } = params;
  const snapshot = stateManager?.getSnapshot();
  const existingMessage = snapshot?.messages.find(
    (message) => message.id === messageId && message.role === "assistant",
  );
  if (existingMessage) {
    return {
      ...structuredClone(existingMessage),
      status: "final",
    };
  }

  const streamingMessage = snapshot?.streamingMessage;
  if (
    streamingMessage?.id === messageId &&
    streamingMessage.role === "assistant"
  ) {
    return {
      ...structuredClone(streamingMessage),
      status: "final",
    };
  }

  return {
    id: messageId,
    sessionId,
    role: "assistant",
    status: "final",
    parts: [],
    timestamp: new Date().toISOString(),
  };
}
