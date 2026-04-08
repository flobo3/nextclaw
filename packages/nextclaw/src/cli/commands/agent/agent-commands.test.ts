import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EffectiveAgentProfile } from "@nextclaw/core";

const mocks = vi.hoisted(() => ({
  loadConfigMock: vi.fn(),
  resolveEffectiveAgentProfilesMock: vi.fn(),
  createAgentProfileMock: vi.fn(),
  updateAgentProfileMock: vi.fn(),
  removeAgentProfileMock: vi.fn(),
  listAvailableAgentRuntimesMock: vi.fn()
}));

vi.mock("@nextclaw/core", () => ({
  BUILTIN_MAIN_AGENT_ID: "main",
  loadConfig: mocks.loadConfigMock,
  resolveEffectiveAgentProfiles: mocks.resolveEffectiveAgentProfilesMock,
  createAgentProfile: mocks.createAgentProfileMock,
  updateAgentProfile: mocks.updateAgentProfileMock,
  removeAgentProfile: mocks.removeAgentProfileMock
}));

vi.mock("./agent-runtime.js", () => ({
  listAvailableAgentRuntimes: mocks.listAvailableAgentRuntimesMock
}));

import { AgentCommands } from "../agents.js";

describe("AgentCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an agent through the dedicated core command and returns json output", async () => {
    const updated: EffectiveAgentProfile = {
      id: "researcher",
      default: false,
      displayName: "Researcher",
      description: "负责调研",
      avatar: "https://example.com/avatar.png",
      workspace: "~/.nextclaw/workspace-researcher",
      runtime: "codex",
      engine: "codex"
    };
    mocks.updateAgentProfileMock.mockReturnValue(updated);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const commands = new AgentCommands({
      requestRestart: vi.fn(async () => undefined),
      initializeAgentHomeDirectory: vi.fn(),
      appName: "nextclaw"
    });

    await commands.agentsUpdate("researcher", {
      name: "Researcher",
      description: "负责调研",
      avatar: "https://example.com/avatar.png",
      runtime: "codex",
      json: true
    });

    expect(mocks.updateAgentProfileMock).toHaveBeenCalledWith({
      id: "researcher",
      displayName: "Researcher",
      description: "负责调研",
      avatar: "https://example.com/avatar.png",
      runtime: "codex"
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      agent: updated,
      restartRequired: true
    }, null, 2));
  });

  it("requests restart after updating an agent in normal mode", async () => {
    mocks.updateAgentProfileMock.mockReturnValue({
      id: "main",
      default: true,
      displayName: "Main",
      description: "负责统筹",
      workspace: "~/.nextclaw/workspace",
      runtime: "native",
      engine: "native"
    } satisfies EffectiveAgentProfile);
    const requestRestart = vi.fn(async () => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const commands = new AgentCommands({
      requestRestart,
      initializeAgentHomeDirectory: vi.fn(),
      appName: "nextclaw"
    });

    await commands.agentsUpdate("main", {
      description: "负责统筹"
    });

    expect(requestRestart).toHaveBeenCalledWith({
      reason: "agents-updated",
      manualMessage: "Updated agent 'main'. Restart nextclaw to apply agent runtime changes."
    });
    expect(logSpy).toHaveBeenCalledWith("✓ Updated agent main");
  });

  it("creates an agent with the runtime option", async () => {
    mocks.createAgentProfileMock.mockReturnValue({
      id: "engineer",
      default: false,
      displayName: "Engineer",
      description: "负责实现",
      workspace: "~/.nextclaw/workspace-engineer",
      runtime: "codex",
      engine: "codex"
    } satisfies EffectiveAgentProfile);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const commands = new AgentCommands({
      requestRestart: vi.fn(async () => undefined),
      initializeAgentHomeDirectory: vi.fn(),
      appName: "nextclaw"
    });

    await commands.agentsNew("engineer", {
      runtime: "codex",
      json: true
    });

    expect(mocks.createAgentProfileMock).toHaveBeenCalledWith({
      id: "engineer",
      displayName: undefined,
      description: undefined,
      avatar: undefined,
      home: undefined,
      runtime: "codex"
    }, {
      initializeHomeDirectory: expect.any(Function)
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      agent: {
        id: "engineer",
        default: false,
        displayName: "Engineer",
        description: "负责实现",
        workspace: "~/.nextclaw/workspace-engineer",
        runtime: "codex",
        engine: "codex"
      },
      restartRequired: true
    }, null, 2));
  });

  it("lists available runtimes in json mode", async () => {
    mocks.listAvailableAgentRuntimesMock.mockResolvedValue({
      defaultRuntime: "native",
      runtimes: [
        {
          value: "native",
          label: "Native",
          default: true,
          source: "builtin",
          ready: true,
          reason: null,
          reasonMessage: null,
          recommendedModel: null,
        },
        {
          value: "codex",
          label: "Codex",
          default: false,
          source: "plugin",
          pluginId: "nextclaw-ncp-runtime-plugin-codex-sdk",
          ready: true,
          reason: null,
          reasonMessage: null,
          recommendedModel: "gpt-5.4",
          supportedModels: ["gpt-5.4", "gpt-5.3"],
        },
      ],
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const commands = new AgentCommands({
      requestRestart: vi.fn(async () => undefined),
      initializeAgentHomeDirectory: vi.fn(),
      appName: "nextclaw"
    });

    await commands.agentsRuntimes({
      json: true,
      probe: true,
    });

    expect(mocks.listAvailableAgentRuntimesMock).toHaveBeenCalledWith({
      describeMode: "probe",
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      defaultRuntime: "native",
      describeMode: "probe",
      runtimes: [
        {
          value: "native",
          label: "Native",
          default: true,
          source: "builtin",
          ready: true,
          reason: null,
          reasonMessage: null,
          recommendedModel: null,
        },
        {
          value: "codex",
          label: "Codex",
          default: false,
          source: "plugin",
          pluginId: "nextclaw-ncp-runtime-plugin-codex-sdk",
          ready: true,
          reason: null,
          reasonMessage: null,
          recommendedModel: "gpt-5.4",
          supportedModels: ["gpt-5.4", "gpt-5.3"],
        },
      ],
    }, null, 2));
  });
});
