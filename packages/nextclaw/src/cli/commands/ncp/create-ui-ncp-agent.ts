import type { ProviderManager, SessionManager } from "@nextclaw/core";
import { DefaultNcpAgentRuntime, DefaultNcpContextBuilder, DefaultNcpToolRegistry } from "@nextclaw/ncp-agent-runtime";
import { createAgentClientFromServer, DefaultNcpAgentBackend } from "@nextclaw/ncp-toolkit";
import type { UiNcpAgent } from "@nextclaw/server";
import { NextclawAgentSessionStore } from "./nextclaw-agent-session-store.js";
import { ProviderManagerNcpLLMApi } from "./provider-manager-ncp-llm-api.js";

export async function createUiNcpAgent(params: {
  providerManager: ProviderManager;
  sessionManager: SessionManager;
}): Promise<UiNcpAgent> {
  const llmApi = new ProviderManagerNcpLLMApi(params.providerManager);
  const sessionStore = new NextclawAgentSessionStore(params.sessionManager);
  const backend = new DefaultNcpAgentBackend({
    endpointId: "nextclaw-ui-agent",
    sessionStore,
    createRuntime: ({ stateManager }) => {
      const toolRegistry = new DefaultNcpToolRegistry();
      return new DefaultNcpAgentRuntime({
        contextBuilder: new DefaultNcpContextBuilder(toolRegistry),
        llmApi,
        toolRegistry,
        stateManager
      });
    }
  });

  await backend.start();

  return {
    basePath: "/api/ncp/agent",
    agentClientEndpoint: createAgentClientFromServer(backend),
    streamProvider: backend,
    sessionApi: backend
  };
}
