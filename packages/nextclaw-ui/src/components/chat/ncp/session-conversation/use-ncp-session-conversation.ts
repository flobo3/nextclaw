import { useCallback, useState } from "react";
import { NcpHttpAgentClientEndpoint } from "@nextclaw/ncp-http-agent-client";
import { useHydratedNcpAgent, type NcpConversationSeed } from "@nextclaw/ncp-react";
import { API_BASE } from "@/api/api-base";
import { fetchNcpSessionMessages } from "@/api/ncp-session";
import { createNcpAppClientFetch } from "@/components/chat/ncp/ncp-app-client-fetch";

const DEFAULT_MESSAGE_LIMIT = 300;

type UseNcpSessionConversationOptions = {
  messageLimit?: number;
};

function isMissingNcpSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("ncp session not found:");
}

export function createNcpSessionConversationClient(): NcpHttpAgentClientEndpoint {
  return new NcpHttpAgentClientEndpoint({
    baseUrl: API_BASE,
    basePath: "/api/ncp/agent",
    fetchImpl: createNcpAppClientFetch(),
  });
}

export async function fetchNcpSessionConversationSeed(
  sessionId: string,
  signal: AbortSignal,
  messageLimit = DEFAULT_MESSAGE_LIMIT,
): Promise<NcpConversationSeed> {
  signal.throwIfAborted();

  try {
    const response = await fetchNcpSessionMessages(sessionId, messageLimit);
    signal.throwIfAborted();
    return {
      messages: response.messages,
      status: response.status ?? "idle",
    };
  } catch (error) {
    signal.throwIfAborted();
    if (!isMissingNcpSessionError(error)) {
      throw error;
    }
    return {
      messages: [],
      status: "idle",
    };
  }
}

export function useNcpSessionConversation(
  sessionId: string,
  options: UseNcpSessionConversationOptions = {},
) {
  const [client] = useState(() => createNcpSessionConversationClient());
  const messageLimit = options.messageLimit ?? DEFAULT_MESSAGE_LIMIT;
  const loadSeed = useCallback(
    (targetSessionId: string, signal: AbortSignal) =>
      fetchNcpSessionConversationSeed(targetSessionId, signal, messageLimit),
    [messageLimit],
  );

  return useHydratedNcpAgent({
    sessionId,
    client,
    loadSeed,
  });
}
