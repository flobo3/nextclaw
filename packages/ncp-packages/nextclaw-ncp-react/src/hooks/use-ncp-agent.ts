import { useEffect, useRef, useState } from "react";
import { DefaultNcpAgentConversationStateManager } from "@nextclaw/ncp-toolkit";
import {
  type NcpAgentClientEndpoint,
  type NcpAgentConversationSnapshot,
  type NcpMessage,
} from "@nextclaw/ncp";

export function useNcpAgent(sessionId: string, client: NcpAgentClientEndpoint) {
  const managerRef = useRef<DefaultNcpAgentConversationStateManager>();
  if (!managerRef.current) {
    managerRef.current = new DefaultNcpAgentConversationStateManager();
  }

  const [snapshot, setSnapshot] = useState<NcpAgentConversationSnapshot>(
    () => managerRef.current!.getSnapshot(),
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    const unsubscribe = manager.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    const unsubscribeClient = client.subscribe((event) => {
      void manager.dispatch(event);
    });

    return () => {
      unsubscribeClient();
      void client.stop();
    };
  }, [client]);

  const visibleMessages: readonly NcpMessage[] = snapshot.streamingMessage
    ? [...snapshot.messages, snapshot.streamingMessage]
    : snapshot.messages;

  const activeRunId = snapshot.activeRun?.runId ?? null;
  const isRunning = !!snapshot.activeRun;

  const send = async (content: string) => {
    if (!content.trim() || isSending || isRunning) {
      return;
    }

    setIsSending(true);
    try {
      await client.send({
        sessionId,
        message: {
          id: `user-${Date.now().toString(36)}`,
          sessionId,
          role: "user",
          status: "final",
          parts: [{ type: "text", text: content.trim() }],
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setIsSending(false);
    }
  };

  const abort = async () => {
    const runId = snapshot.activeRun?.runId;
    if (!runId) {
      return;
    }

    await client.abort({ runId });
  };

  const streamRun = async () => {
    if (!activeRunId) {
      return;
    }

    await client.stream({ sessionId, runId: activeRunId });
  };

  return {
    snapshot,
    visibleMessages,
    activeRunId,
    isRunning,
    isSending,
    send,
    abort,
    streamRun,
  };
}
