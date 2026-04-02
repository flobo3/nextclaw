import { describe, expect, it } from "vitest";
import {
  type NcpAgentConversationStateManager,
  type NcpRequestEnvelope,
  NcpEventType,
} from "@nextclaw/ncp";
import {
  DefaultNcpContextBuilder,
  DefaultNcpAgentRuntime,
  DefaultNcpToolRegistry,
  EchoNcpLLMApi,
} from "@nextclaw/ncp-agent-runtime";
import { DefaultNcpAgentBackend } from "./index.js";
import type { AgentSessionRecord, AgentSessionStore } from "./agent-backend/agent-backend-types.js";

const now = "2026-03-15T00:00:00.000Z";

function createEnvelope(text: string): NcpRequestEnvelope {
  return {
    sessionId: "session-1",
    correlationId: "corr-1",
    message: {
      id: "user-1",
      sessionId: "session-1",
      role: "user",
      status: "final",
      parts: [{ type: "text", text }],
      timestamp: now,
    },
  };
}

class RecordingSessionStore implements AgentSessionStore {
  readonly publishedStatuses: string[] = [];

  private readonly persistedSessions = new Map<string, AgentSessionRecord>();

  constructor(
    private readonly readPublishedStatus: (sessionId: string) => Promise<string>,
  ) {}

  getSession = async (sessionId: string): Promise<AgentSessionRecord | null> => {
    const session = this.persistedSessions.get(sessionId);
    return session ? structuredClone(session) : null;
  };

  listSessions = async (): Promise<AgentSessionRecord[]> => {
    return [...this.persistedSessions.values()].map((session) => structuredClone(session));
  };

  saveSession = async (session: AgentSessionRecord): Promise<void> => {
    this.persistedSessions.set(session.sessionId, structuredClone(session));
    this.publishedStatuses.push(await this.readPublishedStatus(session.sessionId));
  };

  replaceSession = async (session: AgentSessionRecord): Promise<void> => {
    this.persistedSessions.set(session.sessionId, structuredClone(session));
    this.publishedStatuses.push(await this.readPublishedStatus(session.sessionId));
  };

  deleteSession = async (sessionId: string): Promise<AgentSessionRecord | null> => {
    const existing = this.persistedSessions.get(sessionId);
    this.persistedSessions.delete(sessionId);
    return existing ? structuredClone(existing) : null;
  };
}

describe("DefaultNcpAgentBackend final session summary status", () => {
  it("publishes idle after the run fully settles", async () => {
    const backendRef: { current: DefaultNcpAgentBackend | null } = { current: null };
    const sessionStore = new RecordingSessionStore(
      async (sessionId) => (await backendRef.current?.getSession(sessionId))?.status ?? "missing",
    );

    backendRef.current = new DefaultNcpAgentBackend({
      sessionStore,
      createRuntime: ({ stateManager }: { stateManager: NcpAgentConversationStateManager }) => {
        const toolRegistry = new DefaultNcpToolRegistry();
        return new DefaultNcpAgentRuntime({
          contextBuilder: new DefaultNcpContextBuilder(toolRegistry),
          llmApi: new EchoNcpLLMApi(),
          toolRegistry,
          stateManager,
        });
      },
    });

    await backendRef.current.emit({
      type: NcpEventType.MessageRequest,
      payload: createEnvelope("hello"),
    });

    expect(sessionStore.publishedStatuses.at(-1)).toBe("idle");
  });
});
