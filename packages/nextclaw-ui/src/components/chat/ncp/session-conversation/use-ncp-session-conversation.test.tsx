import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchNcpSessionConversationSeed, useNcpSessionConversation } from "./use-ncp-session-conversation";

const mocks = vi.hoisted(() => ({
  fetchNcpSessionMessages: vi.fn(),
  hydratedCalls: [] as Array<{ client: unknown }>,
  useHydratedNcpAgent: vi.fn(() => ({
    snapshot: {
      messages: [],
      streamingMessage: null,
      activeRun: null,
      error: null,
    },
    visibleMessages: [],
    activeRunId: null,
    isRunning: false,
    isSending: false,
    send: vi.fn(),
    abort: vi.fn(),
    streamRun: vi.fn(),
    isHydrating: false,
    hydrateError: null,
  })),
  clientInstances: [] as unknown[],
}));

vi.mock("@/api/ncp-session", () => ({
  fetchNcpSessionMessages: mocks.fetchNcpSessionMessages,
}));

vi.mock("@nextclaw/ncp-react", () => ({
  useHydratedNcpAgent: vi.fn((params: { client: unknown }) => {
    mocks.hydratedCalls.push(params);
    return mocks.useHydratedNcpAgent();
  }),
}));

vi.mock("@nextclaw/ncp-http-agent-client", () => ({
  NcpHttpAgentClientEndpoint: vi.fn().mockImplementation(function MockClient(this: object) {
    mocks.clientInstances.push(this);
  }),
}));

describe("useNcpSessionConversation", () => {
  beforeEach(() => {
    mocks.fetchNcpSessionMessages.mockReset();
    mocks.useHydratedNcpAgent.mockClear();
    mocks.hydratedCalls.length = 0;
    mocks.clientInstances.length = 0;
  });

  it("hydrates seed from the shared session messages endpoint payload", async () => {
    mocks.fetchNcpSessionMessages.mockResolvedValue({
      sessionId: "session-1",
      status: "running",
      total: 1,
      messages: [{ id: "msg-1" }],
    });

    const result = await fetchNcpSessionConversationSeed(
      "session-1",
      new AbortController().signal,
      300,
    );

    expect(mocks.fetchNcpSessionMessages).toHaveBeenCalledWith("session-1", 300);
    expect(result).toEqual({
      messages: [{ id: "msg-1" }],
      status: "running",
    });
  });

  it("treats a missing session as an empty idle draft seed", async () => {
    mocks.fetchNcpSessionMessages.mockRejectedValue(
      new Error("ncp session not found: draft-session"),
    );

    const result = await fetchNcpSessionConversationSeed(
      "draft-session",
      new AbortController().signal,
    );

    expect(result).toEqual({
      messages: [],
      status: "idle",
    });
  });

  it("creates an isolated endpoint instance per viewer", () => {
    renderHook(() => useNcpSessionConversation("session-a"));
    renderHook(() => useNcpSessionConversation("session-b"));

    expect(mocks.useHydratedNcpAgent).toHaveBeenCalledTimes(2);
    expect(mocks.clientInstances).toHaveLength(2);
    expect(mocks.hydratedCalls).toHaveLength(2);
    expect(mocks.clientInstances[0]).not.toBe(mocks.clientInstances[1]);
    expect(mocks.hydratedCalls[0]?.client).toBe(mocks.clientInstances[0]);
    expect(mocks.hydratedCalls[1]?.client).toBe(mocks.clientInstances[1]);
  });
});
