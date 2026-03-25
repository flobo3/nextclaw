import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as NextclawCoreModule from "@nextclaw/core";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NcpEventType } from "@nextclaw/ncp";

const setPluginRuntimeBridgeMock = vi.hoisted(() => vi.fn());
const loadConfigMock = vi.hoisted(() => vi.fn(() => ({})));
const resolveConfigSecretsMock = vi.hoisted(() => vi.fn((config) => config));
const saveConfigMock = vi.hoisted(() => vi.fn());

vi.mock("@nextclaw/openclaw-compat", () => ({
  setPluginRuntimeBridge: setPluginRuntimeBridgeMock,
}));

vi.mock("@nextclaw/core", async (importOriginal) => {
  const actual = await importOriginal<typeof NextclawCoreModule>();
  return {
    ...actual,
    loadConfig: loadConfigMock,
    resolveConfigSecrets: resolveConfigSecretsMock,
    saveConfig: saveConfigMock,
  };
});

import { installPluginRuntimeBridge } from "./service-plugin-runtime-bridge.js";

function getBridge() {
  return setPluginRuntimeBridgeMock.mock.calls[0]?.[0] as {
    dispatchReplyWithBufferedBlockDispatcher: (params: {
      ctx: Record<string, unknown>;
      dispatcherOptions: { deliver: (payload: unknown, info: unknown) => Promise<void> };
    }) => Promise<void>;
  };
}

function createTempImage(): { tempDir: string; imagePath: string } {
  const tempDir = mkdtempSync(join(tmpdir(), "service-plugin-runtime-bridge-test-"));
  const imagePath = join(tempDir, "photo.png");
  writeFileSync(imagePath, Buffer.from("png-data"));
  return { tempDir, imagePath };
}

function createUiNcpAgentSendMock(params: {
  onSend: (envelope: { sessionId: string; message: { parts: Array<Record<string, unknown>> } }) => void;
}) {
  const listeners = new Set<(event: { type: NcpEventType; payload?: Record<string, unknown> }) => void>();
  const send = vi.fn(async (envelope: { sessionId: string; message: { parts: Array<Record<string, unknown>> } }) => {
    params.onSend(envelope);
  });
  return {
    send,
    agent: {
      agentClientEndpoint: {
        subscribe: (listener: (event: { type: NcpEventType; payload?: Record<string, unknown> }) => void) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        send: async (envelope: { sessionId: string; message: { parts: Array<Record<string, unknown>> } }) => {
          await send(envelope);
          return;
        },
      },
    },
    emit(event: { type: NcpEventType; payload?: Record<string, unknown> }) {
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

describe("installPluginRuntimeBridge media attachment forwarding", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("maps MediaPaths into runtime attachments", async () => {
    const processDirect = vi.fn(async () => "ok");
    installPluginRuntimeBridge({
      runtimePool: { processDirect } as never,
      sessionManager: { getIfExists: vi.fn(() => null) } as never,
      runtimeConfigPath: "/tmp/config.json",
      pluginChannelBindings: [],
      getUiNcpAgent: () => null,
    });

    const bridge = getBridge();

    await bridge.dispatchReplyWithBufferedBlockDispatcher({
      ctx: {
        BodyForAgent: "look at this",
        SessionKey: "agent:main:feishu:direct:oc_chat",
        OriginatingChannel: "feishu",
        OriginatingTo: "oc_chat",
        MediaPath: "/tmp/first.png",
        MediaPaths: ["/tmp/first.png", "/tmp/second.png"],
        MediaType: "image/png",
        MediaTypes: ["image/png", "image/jpeg"],
      },
      dispatcherOptions: {
        deliver: vi.fn(async () => {}),
      },
    });

    expect(processDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            path: "/tmp/first.png",
            mimeType: "image/png",
            status: "ready",
          }),
          expect.objectContaining({
            path: "/tmp/second.png",
            mimeType: "image/jpeg",
            status: "ready",
          }),
        ],
      }),
    );
  });

  it("keeps remote-only media when only MediaUrls are available", async () => {
    const processDirect = vi.fn(async () => "ok");
    installPluginRuntimeBridge({
      runtimePool: { processDirect } as never,
      sessionManager: { getIfExists: vi.fn(() => null) } as never,
      runtimeConfigPath: "/tmp/config.json",
      pluginChannelBindings: [],
      getUiNcpAgent: () => null,
    });

    const bridge = getBridge();

    await bridge.dispatchReplyWithBufferedBlockDispatcher({
      ctx: {
        Body: "describe this image",
        SenderId: "ou_sender",
        MediaUrls: ["https://example.com/a.png"],
        MediaTypes: ["image/png"],
      },
      dispatcherOptions: {
        deliver: vi.fn(async () => {}),
      },
    });

    expect(processDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            url: "https://example.com/a.png",
            mimeType: "image/png",
            status: "remote-only",
          }),
        ],
      }),
    );
  });

  it("routes existing NCP sessions through the UI NCP agent and includes file parts", async () => {
    const { tempDir, imagePath } = createTempImage();
    const processDirect = vi.fn(async () => "legacy");
    const ncpHandle = createUiNcpAgentSendMock({
      onSend: (envelope) => {
        ncpHandle.emit({
          type: NcpEventType.MessageTextDelta,
          payload: {
            sessionId: envelope.sessionId,
            messageId: "assistant-1",
            delta: "ncp reply",
          },
        });
        ncpHandle.emit({
          type: NcpEventType.RunFinished,
          payload: {
            sessionId: envelope.sessionId,
            runId: "run-1",
          },
        });
      },
    });

    installPluginRuntimeBridge({
      runtimePool: { processDirect } as never,
      sessionManager: {
        getIfExists: vi.fn(() => ({
          metadata: { session_type: "codex" },
        })),
      } as never,
      runtimeConfigPath: "/tmp/config.json",
      pluginChannelBindings: [],
      getUiNcpAgent: () => ncpHandle.agent as never,
    });

    const deliver = vi.fn(async () => {});
    const bridge = getBridge();

    try {
      await bridge.dispatchReplyWithBufferedBlockDispatcher({
        ctx: {
          BodyForAgent: "describe this image",
          SessionKey: "agent:main:feishu:direct:oc_chat",
          OriginatingChannel: "feishu",
          OriginatingTo: "oc_chat",
          MediaPath: imagePath,
          MediaType: "image/png",
        },
        dispatcherOptions: {
          deliver,
        },
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    expect(processDirect).not.toHaveBeenCalled();
    expect(ncpHandle.send).toHaveBeenCalledTimes(1);
    expect(ncpHandle.send).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "agent:main:feishu:direct:oc_chat",
        message: expect.objectContaining({
          parts: [
            expect.objectContaining({ type: "text", text: "describe this image" }),
            expect.objectContaining({
              type: "file",
              name: "photo.png",
              mimeType: "image/png",
              contentBase64: Buffer.from("png-data").toString("base64"),
            }),
          ],
        }),
      }),
    );
    expect(deliver).toHaveBeenCalledWith({ text: "ncp reply" }, { kind: "final" });
  });

  it("keeps attachment-only messages alive for NCP sessions", async () => {
    const { tempDir, imagePath } = createTempImage();
    const ncpHandle = createUiNcpAgentSendMock({
      onSend: (envelope) => {
        ncpHandle.emit({
          type: NcpEventType.MessageCompleted,
          payload: {
            sessionId: envelope.sessionId,
            message: {
              id: "assistant-1",
              sessionId: envelope.sessionId,
              role: "assistant",
              status: "final",
              timestamp: new Date().toISOString(),
              parts: [{ type: "text", text: "attachment handled" }],
            },
          },
        });
        ncpHandle.emit({
          type: NcpEventType.RunFinished,
          payload: {
            sessionId: envelope.sessionId,
            runId: "run-1",
          },
        });
      },
    });

    installPluginRuntimeBridge({
      runtimePool: { processDirect: vi.fn(async () => "legacy") } as never,
      sessionManager: {
        getIfExists: vi.fn(() => ({
          metadata: { session_type: "codex" },
        })),
      } as never,
      runtimeConfigPath: "/tmp/config.json",
      pluginChannelBindings: [],
      getUiNcpAgent: () => ncpHandle.agent as never,
    });

    const bridge = getBridge();

    try {
      await bridge.dispatchReplyWithBufferedBlockDispatcher({
        ctx: {
          SessionKey: "agent:main:feishu:direct:oc_chat",
          OriginatingChannel: "feishu",
          OriginatingTo: "oc_chat",
          MediaPath: imagePath,
          MediaType: "image/png",
        },
        dispatcherOptions: {
          deliver: vi.fn(async () => {}),
        },
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }

    const envelope = ncpHandle.send.mock.calls[0]?.[0] as { message: { parts: Array<Record<string, unknown>> } };
    expect(envelope.message.parts).toContainEqual(
      expect.objectContaining({
        type: "text",
        text: "Please inspect the attached file(s) and respond.",
      }),
    );
    expect(envelope.message.parts).toContainEqual(
      expect.objectContaining({
        type: "file",
        name: "photo.png",
      }),
    );
  });
});
