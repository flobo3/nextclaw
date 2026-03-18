import type {
  Config,
  CronService,
  GatewayController,
  MessageBus,
  ProviderManager,
  SessionManager,
} from "@nextclaw/core";
import { DefaultNcpAgentRuntime } from "@nextclaw/ncp-agent-runtime";
import {
  readAssistantReasoningNormalizationMode,
  readAssistantReasoningNormalizationModeFromMetadata,
  writeAssistantReasoningNormalizationModeToMetadata,
  type NcpAssistantReasoningNormalizationMode,
} from "@nextclaw/ncp";
import { createAgentClientFromServer, DefaultNcpAgentBackend } from "@nextclaw/ncp-toolkit";
import type { UiNcpAgent } from "@nextclaw/server";
import type { NextclawExtensionRegistry } from "../plugins.js";
import { NextclawNcpContextBuilder } from "./nextclaw-ncp-context-builder.js";
import { NextclawAgentSessionStore } from "./nextclaw-agent-session-store.js";
import { NextclawNcpToolRegistry } from "./nextclaw-ncp-tool-registry.js";
import { ProviderManagerNcpLLMApi } from "./provider-manager-ncp-llm-api.js";
import { UiNcpRuntimeRegistry } from "./ui-ncp-runtime-registry.js";

type MessageToolHintsResolver = (params: {
  sessionKey: string;
  channel: string;
  chatId: string;
  accountId?: string | null;
}) => string[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveNativeReasoningNormalizationMode(params: {
  config: Config;
  sessionMetadata: Record<string, unknown>;
}): NcpAssistantReasoningNormalizationMode {
  const runtimeEntry = params.config.ui.ncp.runtimes.native;
  const runtimeMetadata = isRecord(runtimeEntry) ? runtimeEntry : {};

  return (
    readAssistantReasoningNormalizationModeFromMetadata(params.sessionMetadata) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoningNormalization) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoning_normalization) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoningNormalizationMode) ??
    readAssistantReasoningNormalizationMode(runtimeMetadata.reasoning_normalization_mode) ??
    "think-tags"
  );
}

export async function createUiNcpAgent(params: {
  bus: MessageBus;
  providerManager: ProviderManager;
  sessionManager: SessionManager;
  cronService?: CronService | null;
  gatewayController?: GatewayController;
  getConfig: () => Config;
  getExtensionRegistry?: () => NextclawExtensionRegistry | undefined;
  resolveMessageToolHints?: MessageToolHintsResolver;
}): Promise<UiNcpAgent> {
  const sessionStore = new NextclawAgentSessionStore(params.sessionManager);
  const buildRuntimeRegistry = (): UiNcpRuntimeRegistry => {
    const runtimeRegistry = new UiNcpRuntimeRegistry();
    runtimeRegistry.register({
      kind: "native",
      label: "Native",
      createRuntime: ({ stateManager, sessionMetadata, setSessionMetadata }) => {
        const reasoningNormalizationMode = resolveNativeReasoningNormalizationMode({
          config: params.getConfig(),
          sessionMetadata,
        });
        if (
          reasoningNormalizationMode !== "off" &&
          readAssistantReasoningNormalizationModeFromMetadata(sessionMetadata) !== reasoningNormalizationMode
        ) {
          setSessionMetadata(
            writeAssistantReasoningNormalizationModeToMetadata(
              sessionMetadata,
              reasoningNormalizationMode,
            ),
          );
        }

        const toolRegistry = new NextclawNcpToolRegistry({
          bus: params.bus,
          providerManager: params.providerManager,
          sessionManager: params.sessionManager,
          cronService: params.cronService,
          gatewayController: params.gatewayController,
          getConfig: params.getConfig,
          getExtensionRegistry: params.getExtensionRegistry,
        });
        return new DefaultNcpAgentRuntime({
          contextBuilder: new NextclawNcpContextBuilder({
            sessionManager: params.sessionManager,
            toolRegistry,
            getConfig: params.getConfig,
            resolveMessageToolHints: params.resolveMessageToolHints,
          }),
          llmApi: new ProviderManagerNcpLLMApi(params.providerManager),
          toolRegistry,
          stateManager,
          reasoningNormalizationMode,
        });
      },
    });
    for (const registration of params.getExtensionRegistry?.()?.ncpAgentRuntimes ?? []) {
      runtimeRegistry.register({
        kind: registration.kind,
        label: registration.label,
        createRuntime: registration.createRuntime,
      });
    }
    return runtimeRegistry;
  };

  const backend = new DefaultNcpAgentBackend({
    endpointId: "nextclaw-ui-agent",
    sessionStore,
    createRuntime: (runtimeParams) => buildRuntimeRegistry().createRuntime(runtimeParams),
  });

  await backend.start();

  return {
    basePath: "/api/ncp/agent",
    agentClientEndpoint: createAgentClientFromServer(backend),
    streamProvider: backend,
    sessionApi: backend,
    listSessionTypes: () => buildRuntimeRegistry().listSessionTypes(),
  };
}
