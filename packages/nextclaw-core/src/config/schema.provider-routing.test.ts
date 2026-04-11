import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configureProviderCatalog } from "../providers/registry.js";
import { ConfigSchema, getApiBase, getProviderName } from "./schema.js";

describe("provider apiBase routing", () => {
  beforeEach(() => {
    configureProviderCatalog([
      {
        id: "test-builtin-providers",
        providers: [
          {
            name: "nextclaw",
            keywords: ["nextclaw", "dashscope/", "qwen3.5", "qwen"],
            envKey: "NEXTCLAW_API_KEY",
            defaultApiBase: "https://ai-gateway-api.nextclaw.io/v1",
            isGateway: true,
            isLocal: false
          },
          {
            name: "dashscope-coding-plan",
            keywords: ["dashscope-coding-plan", "coding-plan"],
            envKey: "DASHSCOPE_CODING_PLAN_API_KEY",
            defaultApiBase: "https://coding.dashscope.aliyuncs.com/v1",
            isGateway: false,
            isLocal: false
          },
          {
            name: "kimi-coding",
            keywords: ["kimi-coding", "kimi-for-coding"],
            envKey: "KIMI_CODING_API_KEY",
            defaultApiBase: "https://api.kimi.com/coding",
            isGateway: false,
            isLocal: false
          },
          {
            name: "deepseek",
            keywords: ["deepseek"],
            envKey: "DEEPSEEK_API_KEY",
            defaultApiBase: "https://api.deepseek.com",
            isGateway: false,
            isLocal: false
          }
        ]
      }
    ]);
  });

  afterEach(() => {
    configureProviderCatalog([]);
  });

  it("uses built-in nextclaw provider when prefixed provider has no apiKey", () => {
    const config = ConfigSchema.parse({
      providers: {
        nextclaw: {
          apiKey: "nc_free_test_key"
        }
      }
    });

    expect(getProviderName(config, "dashscope/qwen3.5-flash")).toBe("nextclaw");
    expect(getApiBase(config, "dashscope/qwen3.5-flash")).toBe("https://ai-gateway-api.nextclaw.io/v1");
  });

  it("uses provider default api base for non-gateway providers when apiBase is unset", () => {
    const config = ConfigSchema.parse({
      providers: {
        deepseek: {
          apiKey: "sk-deepseek"
        }
      }
    });

    expect(getApiBase(config, "deepseek-chat")).toBe("https://api.deepseek.com");
  });

  it("prefers explicit provider apiBase over provider default", () => {
    const config = ConfigSchema.parse({
      providers: {
        deepseek: {
          apiKey: "sk-deepseek",
          apiBase: "https://custom.deepseek.example/v1"
        }
      }
    });

    expect(getApiBase(config, "deepseek-chat")).toBe("https://custom.deepseek.example/v1");
  });

  it("routes custom provider by model prefix and uses its explicit apiBase", () => {
    const config = ConfigSchema.parse({
      providers: {
        "custom-1": {
          apiKey: "sk-relay",
          apiBase: "https://relay-b.example.com/v1"
        }
      }
    });

    expect(getProviderName(config, "custom-1/gpt-4o-mini")).toBe("custom-1");
    expect(getApiBase(config, "custom-1/gpt-4o-mini")).toBe("https://relay-b.example.com/v1");
  });

  it("routes dashscope coding plan by its dedicated provider prefix", () => {
    const config = ConfigSchema.parse({
      providers: {
        "dashscope-coding-plan": {
          apiKey: "sk-sp-test-key"
        }
      }
    });

    expect(getProviderName(config, "dashscope-coding-plan/qwen3.5-plus")).toBe("dashscope-coding-plan");
    expect(getApiBase(config, "dashscope-coding-plan/qwen3.5-plus")).toBe("https://coding.dashscope.aliyuncs.com/v1");
  });

  it("routes kimi coding by its dedicated provider prefix", () => {
    const config = ConfigSchema.parse({
      providers: {
        "kimi-coding": {
          apiKey: "kimi-test-key"
        }
      }
    });

    expect(getProviderName(config, "kimi-coding/kimi-for-coding")).toBe("kimi-coding");
    expect(getApiBase(config, "kimi-coding/kimi-for-coding")).toBe("https://api.kimi.com/coding");
  });

  it("skips disabled providers during routing", () => {
    const config = ConfigSchema.parse({
      providers: {
        nextclaw: {
          apiKey: "nc_free_test_key"
        },
        deepseek: {
          enabled: false,
          apiKey: "sk-deepseek",
          apiBase: "https://custom.deepseek.example/v1"
        }
      }
    });

    expect(getProviderName(config, "deepseek-chat")).toBe("nextclaw");
    expect(getApiBase(config, "deepseek-chat")).toBe("https://ai-gateway-api.nextclaw.io/v1");
  });
});
