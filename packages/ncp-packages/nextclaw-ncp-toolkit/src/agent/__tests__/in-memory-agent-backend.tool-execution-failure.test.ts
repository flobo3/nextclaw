import { describe, expect, it } from "vitest";
import type {
  NcpAgentConversationStateManager,
  NcpLLMApi,
  NcpLLMApiInput,
  NcpRequestEnvelope,
  NcpTool,
  NcpToolDefinition,
  NcpToolRegistry,
  OpenAIChatChunk,
} from "@nextclaw/ncp";
import { DefaultNcpContextBuilder, DefaultNcpAgentRuntime } from "@nextclaw/ncp-agent-runtime";
import { NcpEventType } from "@nextclaw/ncp";
import { DefaultNcpAgentBackend, InMemoryAgentSessionStore } from "../index.js";

const now = "2026-03-15T00:00:00.000Z";

const createEnvelope = (text: string): NcpRequestEnvelope => ({
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
});

class ToolExecutionFailsThenAnswerNcpLLMApi implements NcpLLMApi {
  readonly inputs: NcpLLMApiInput[] = [];

  generate = async function* (
    this: ToolExecutionFailsThenAnswerNcpLLMApi,
    input: NcpLLMApiInput,
  ): AsyncGenerator<OpenAIChatChunk> {
    this.inputs.push(structuredClone(input));

    const hasToolFeedback = input.messages.some((message) => message.role === "tool");
    if (!hasToolFeedback) {
      yield {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call-execution-failed",
                  type: "function",
                  function: {
                    name: "explode",
                    arguments: '{"path":"/tmp/file.txt"}',
                  },
                },
              ],
            },
          },
        ],
      };
      yield {
        choices: [{ delta: {}, finish_reason: "tool_calls" }],
      };
      return;
    }

    yield {
      choices: [{ delta: { content: "handled tool execution failure" } }],
    };
    yield {
      choices: [{ delta: {}, finish_reason: "stop" }],
    };
  };
}

class ThrowingToolRegistry implements NcpToolRegistry {
  readonly executeCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: unknown;
  }> = [];

  private readonly tool: NcpTool = {
    name: "explode",
    description: "Throw during tool execution",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
      required: ["path"],
      additionalProperties: false,
    },
    execute: async () => {
      throw new Error("boom");
    },
  };

  listTools = (): readonly NcpTool[] => [this.tool];

  getTool = (name: string): NcpTool | undefined =>
    name === this.tool.name ? this.tool : undefined;

  getToolDefinitions = (): ReadonlyArray<NcpToolDefinition> => {
    return [
      {
        name: this.tool.name,
        description: this.tool.description,
        parameters: this.tool.parameters,
      },
    ];
  };

  execute = async (
    toolCallId: string,
    toolName: string,
    args: unknown,
  ): Promise<unknown> => {
    this.executeCalls.push({ toolCallId, toolName, args });
    return this.tool.execute(args);
  };
}

describe("DefaultNcpAgentBackend tool execution failures", () => {
  it("returns structured tool execution errors without escalating to run error", async () => {
    const llmApi = new ToolExecutionFailsThenAnswerNcpLLMApi();
    const toolRegistry = new ThrowingToolRegistry();
    const backend = new DefaultNcpAgentBackend({
      sessionStore: new InMemoryAgentSessionStore(),
      createRuntime: ({
        stateManager,
      }: {
        stateManager: NcpAgentConversationStateManager;
      }) => {
        return new DefaultNcpAgentRuntime({
          contextBuilder: new DefaultNcpContextBuilder(toolRegistry),
          llmApi,
          toolRegistry,
          stateManager,
        });
      },
    });

    const toolResults: unknown[] = [];
    const eventTypes: string[] = [];
    backend.subscribe((event) => {
      eventTypes.push(event.type);
      if (event.type === NcpEventType.MessageToolCallResult) {
        toolResults.push(event.payload.content);
      }
    });

    await backend.emit({
      type: NcpEventType.MessageRequest,
      payload: createEnvelope("run explode"),
    });

    expect(toolRegistry.executeCalls).toHaveLength(1);
    expect(toolResults).toEqual([
      {
        ok: false,
        error: {
          code: "tool_execution_failed",
          message: "boom",
          toolCallId: "call-execution-failed",
          toolName: "explode",
        },
      },
    ]);
    expect(eventTypes).not.toContain(NcpEventType.RunError);
    expect(eventTypes).toContain(NcpEventType.RunFinished);
    expect(llmApi.inputs).toHaveLength(2);
  });
});
