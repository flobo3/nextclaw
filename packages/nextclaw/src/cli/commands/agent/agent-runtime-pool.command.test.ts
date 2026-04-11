import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigSchema, SessionManager, type Config } from "@nextclaw/core";
import { NcpEventType } from "@nextclaw/ncp";
import { GatewayAgentRuntimePool } from "./agent-runtime-pool.js";

const tempWorkspaces: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(
    join(tmpdir(), "nextclaw-runtime-pool-command-test-"),
  );
  tempWorkspaces.push(workspace);
  return workspace;
}

afterEach(() => {
  while (tempWorkspaces.length > 0) {
    const workspace = tempWorkspaces.pop();
    if (!workspace) {
      continue;
    }
    rmSync(workspace, { recursive: true, force: true });
  }
});

function createConfig(workspace: string): Config {
  return ConfigSchema.parse({
    agents: {
      defaults: {
        workspace,
        model: "openai/gpt-5",
      },
    },
  });
}

function createNcpAgent(params?: {
  text?: string;
  metadata?: Record<string, unknown>;
  events?: Array<{ type: string; payload: Record<string, unknown> }>;
}) {
  const assetApiPut = vi.fn(async () => ({ uri: "asset://uploaded-file" }));
  const send = vi.fn(
    async function* (input: {
      sessionId: string;
      message: {
        sessionId: string;
        parts: Array<Record<string, unknown>>;
        metadata?: Record<string, unknown>;
      };
      metadata?: Record<string, unknown>;
    }) {
      for (const event of params?.events ?? []) {
        yield event;
      }
      yield {
        type: NcpEventType.MessageCompleted,
        payload: {
          message: {
            id: `${input.sessionId}:assistant`,
            sessionId: input.sessionId,
            role: "assistant",
            status: "final",
            timestamp: new Date().toISOString(),
            parts:
              params?.text === undefined ? [] : [{ type: "text", text: params.text }],
            metadata: structuredClone(params?.metadata ?? input.metadata ?? {}),
          },
        },
      };
    },
  );

  return {
    agent: {
      basePath: "/api/ncp/agent",
      agentClientEndpoint: {} as never,
      streamProvider: {} as never,
      runApi: { send },
      sessionApi: {} as never,
      listSessionTypes: vi.fn(),
      assetApi: { put: assetApiPut },
    },
    send,
    assetApiPut,
  };
}

function createRuntimePool(params: {
  workspace: string;
  resolveNcpAgent?: () => ReturnType<typeof createNcpAgent>["agent"] | null;
}) {
  const config = createConfig(params.workspace);
  const sessionManager = new SessionManager(params.workspace);
  const bus = {
    consumeInbound: vi.fn(async () => {
      throw new Error("not implemented in unit test");
    }),
    publishOutbound: vi.fn(async () => undefined),
  };

  const runtimePool = new GatewayAgentRuntimePool({
    bus: bus as never,
    sessionManager,
    config,
    resolveNcpAgent: params.resolveNcpAgent as (() => never) | undefined,
  });

  return {
    runtimePool,
    bus,
  };
}

describe("GatewayAgentRuntimePool direct dispatch", () => {
  it("executes slash command before NCP dispatch", async () => {
    const workspace = createWorkspace();
    const ncpAgent = createNcpAgent({ text: "ncp-reply" });
    const { runtimePool } = createRuntimePool({
      workspace,
      resolveNcpAgent: vi.fn(() => ncpAgent.agent),
    });

    const result = await runtimePool.processDirect({
      content: "/status",
      sessionKey: "agent:main:ui:direct:web-ui",
      channel: "ui",
      chatId: "web-ui",
    });

    expect(result).toContain("Session: agent:main:ui:direct:web-ui");
    expect(ncpAgent.send).not.toHaveBeenCalled();
  });

  it("falls back to NCP dispatch for normal messages", async () => {
    const workspace = createWorkspace();
    const ncpAgent = createNcpAgent({ text: "ncp-reply" });
    const { runtimePool } = createRuntimePool({
      workspace,
      resolveNcpAgent: vi.fn(() => ncpAgent.agent),
    });

    const result = await runtimePool.processDirect({
      content: "hello",
      sessionKey: "agent:main:ui:direct:web-ui",
      channel: "ui",
      chatId: "web-ui",
    });

    expect(result).toBe("ncp-reply");
    expect(ncpAgent.send).toHaveBeenCalledTimes(1);
    expect(ncpAgent.send).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "agent:main:ui:direct:web-ui",
        metadata: expect.objectContaining({
          agent_id: "main",
          channel: "ui",
          chatId: "web-ui",
        }),
      }),
      {},
    );
  });

  it("uploads local attachments and forwards assetUri parts to NCP", async () => {
    const workspace = createWorkspace();
    const ncpAgent = createNcpAgent({ text: "image reply" });
    const { runtimePool } = createRuntimePool({
      workspace,
      resolveNcpAgent: vi.fn(() => ncpAgent.agent),
    });
    const attachmentPath = join(workspace, "inbound-image.png");
    writeFileSync(attachmentPath, "fake-image");

    const result = await runtimePool.processDirect({
      content: "describe image",
      sessionKey: "agent:main:feishu:direct:oc-chat",
      channel: "feishu",
      chatId: "oc-chat",
      attachments: [
        {
          path: attachmentPath,
          mimeType: "image/png",
          status: "ready",
        },
      ],
    });

    expect(result).toBe("image reply");
    expect(ncpAgent.assetApiPut).toHaveBeenCalledTimes(1);
    expect(ncpAgent.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          parts: [
            { type: "text", text: "describe image" },
            expect.objectContaining({
              type: "file",
              assetUri: "asset://uploaded-file",
              mimeType: "image/png",
            }),
          ],
        }),
      }),
      {},
    );
  });

  it("marks stop unsupported when the NCP agent is not ready", () => {
    const workspace = createWorkspace();
    const { runtimePool } = createRuntimePool({
      workspace,
      resolveNcpAgent: vi.fn(() => null),
    });

    const capability = runtimePool.supportsTurnAbort({
      sessionKey: "agent:main:ui:direct:web-ui",
      channel: "ui",
      chatId: "web-ui",
    });

    expect(capability.supported).toBe(false);
    expect(capability.reason).toContain("not ready");
  });

  it("marks stop supported when the NCP agent is ready", () => {
    const workspace = createWorkspace();
    const ncpAgent = createNcpAgent({ text: "ok" });
    const { runtimePool } = createRuntimePool({
      workspace,
      resolveNcpAgent: vi.fn(() => ncpAgent.agent),
    });

    const capability = runtimePool.supportsTurnAbort({
      sessionKey: "agent:main:ui:direct:web-ui",
      channel: "ui",
      chatId: "web-ui",
    });

    expect(capability.supported).toBe(true);
  });
});

describe("GatewayAgentRuntimePool inbound dispatch", () => {
  it("streams reset, delta, and final reply for non-system messages", async () => {
    const workspace = createWorkspace();
    const ncpAgent = createNcpAgent({
      text: "final reply",
      events: [
        {
          type: NcpEventType.MessageTextDelta,
          payload: { delta: "partial" },
        },
      ],
    });
    const inboundQueue: Array<Record<string, unknown> | null> = [
      {
        channel: "feishu",
        senderId: "ou_sender",
        chatId: "oc_chat",
        content: "hello",
        timestamp: new Date(),
        attachments: [],
        metadata: {},
      },
      null,
    ];
    const bus = {
      consumeInbound: vi.fn(async () => {
        const next = inboundQueue.shift();
        if (!next) {
          throw new Error("stop-loop");
        }
        return next;
      }),
      publishOutbound: vi.fn(async () => undefined),
    };

    const runtimePool = new GatewayAgentRuntimePool({
      bus: bus as never,
      sessionManager: new SessionManager(workspace),
      config: createConfig(workspace),
      resolveNcpAgent: (() => ncpAgent.agent) as () => never,
    });

    await expect(runtimePool.run()).rejects.toThrow("stop-loop");
    expect(bus.publishOutbound).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        channel: "feishu",
        chatId: "oc_chat",
        content: "",
      }),
    );
    expect(bus.publishOutbound).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        channel: "feishu",
        chatId: "oc_chat",
        content: "",
      }),
    );
    expect(bus.publishOutbound).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        channel: "feishu",
        chatId: "oc_chat",
        content: "final reply",
      }),
    );
  });

  it("routes system messages back to session_key_override and emits session update hook", async () => {
    const workspace = createWorkspace();
    const ncpAgent = createNcpAgent({ text: "ignored" });
    const inboundQueue: Array<Record<string, unknown> | null> = [
      {
        channel: "system",
        senderId: "subagent",
        chatId: "ui:web-ui",
        content: "subagent done",
        timestamp: new Date(),
        attachments: [],
        metadata: {
          session_key_override: "agent:main:ui:direct:web-ui",
          target_agent_id: "main",
        },
      },
      null,
    ];
    const bus = {
      consumeInbound: vi.fn(async () => {
        const next = inboundQueue.shift();
        if (!next) {
          throw new Error("stop-loop");
        }
        return next;
      }),
      publishOutbound: vi.fn(async () => undefined),
    };

    const runtimePool = new GatewayAgentRuntimePool({
      bus: bus as never,
      sessionManager: new SessionManager(workspace),
      config: createConfig(workspace),
      resolveNcpAgent: (() => ncpAgent.agent) as () => never,
    });
    const sessionUpdated = vi.fn();
    runtimePool.setSystemSessionUpdatedHandler(sessionUpdated);

    await expect(runtimePool.run()).rejects.toThrow("stop-loop");
    expect(ncpAgent.send).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "agent:main:ui:direct:web-ui",
        metadata: expect.objectContaining({
          agent_id: "main",
          channel: "system",
          chatId: "ui:web-ui",
        }),
      }),
      {},
    );
    expect(sessionUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: "agent:main:ui:direct:web-ui",
      }),
    );
  });
});
