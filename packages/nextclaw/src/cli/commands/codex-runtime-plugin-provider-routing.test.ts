import { describe, expect, it, vi } from "vitest";
import { ConfigSchema, type Config } from "@nextclaw/core";
import type { RuntimeFactoryParams } from "@nextclaw/ncp-toolkit";
import type { NcpAgentRuntime } from "@nextclaw/ncp";
import codexRuntimePlugin from "../../../../extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.js";

function createConfig(input: Record<string, unknown> = {}): Config {
  return ConfigSchema.parse({
    agents: {
      defaults: {
        workspace: "/tmp/nextclaw-codex-runtime-plugin-provider-routing",
        model: "custom-1/gpt-5.4",
      },
    },
    providers: {
      "custom-1": {
        displayName: "yunyi",
        apiKey: "test-key",
        apiBase: "https://yunyi.example.com/v1",
        models: ["gpt-5.4"],
      },
    },
    ...input,
  });
}

function createRuntimeConfig(params?: {
  config?: Config;
  pluginConfig?: Record<string, unknown>;
  sessionMetadata?: Record<string, unknown>;
}): Record<string, unknown> {
  let createRuntime: ((runtimeParams: RuntimeFactoryParams) => NcpAgentRuntime) | null = null;

  codexRuntimePlugin.register({
    config: params?.config ?? createConfig({}),
    pluginConfig: params?.pluginConfig,
    registerNcpAgentRuntime(registration) {
      createRuntime = registration.createRuntime;
    },
  });

  if (!createRuntime) {
    throw new Error("codex runtime registration missing");
  }

  const runtimeFactory = createRuntime as unknown as (runtimeParams: RuntimeFactoryParams) => NcpAgentRuntime;
  const runtime = runtimeFactory({
    sessionId: "session-1",
    stateManager: undefined as never,
    sessionMetadata: params?.sessionMetadata ?? {
      preferred_model: "custom-1/gpt-5.4",
    },
    setSessionMetadata: vi.fn(),
  });

  const runtimeConfig = Reflect.get(runtime as object, "config");
  if (!runtimeConfig || typeof runtimeConfig !== "object") {
    throw new Error("runtime config is missing");
  }
  return runtimeConfig as Record<string, unknown>;
}

describe("codex runtime plugin provider routing", () => {
  it("maps custom provider displayName to Codex model_provider", () => {
    const runtimeConfig = createRuntimeConfig();
    const cliConfig = runtimeConfig.cliConfig as Record<string, unknown>;
    const modelProviders = cliConfig.model_providers as Record<string, Record<string, unknown>>;

    expect(runtimeConfig.model).toBe("gpt-5.4");
    expect(cliConfig.model_provider).toBe("yunyi");
    expect(modelProviders.yunyi).toEqual(
      expect.objectContaining({
        name: "yunyi",
        base_url: "https://yunyi.example.com/v1",
      }),
    );
  });

  it("prefers explicit modelProvider override for custom providers", () => {
    const runtimeConfig = createRuntimeConfig({
      config: createConfig({
        providers: {
          "custom-1": {
            displayName: "Relay B",
            apiKey: "test-key",
            apiBase: "https://yunyi.example.com/v1",
            models: ["gpt-5.4"],
          },
        },
      }),
      pluginConfig: {
        modelProvider: "yunyi",
      },
    });
    const cliConfig = runtimeConfig.cliConfig as Record<string, unknown>;

    expect(cliConfig.model_provider).toBe("yunyi");
  });

  it("fails fast when a custom provider has no valid external provider id", () => {
    expect(() =>
      createRuntimeConfig({
        config: createConfig({
          providers: {
            "custom-1": {
              displayName: "Relay B",
              apiKey: "test-key",
              apiBase: "https://yunyi.example.com/v1",
              models: ["gpt-5.4"],
            },
          },
        }),
      }),
    ).toThrowError(/config\.modelProvider/);
  });
});
