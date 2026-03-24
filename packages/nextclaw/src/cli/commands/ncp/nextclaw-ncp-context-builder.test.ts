import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigSchema, SessionManager } from "@nextclaw/core";
import { NextclawNcpContextBuilder } from "./nextclaw-ncp-context-builder.js";

const tempWorkspaces: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "nextclaw-ncp-context-builder-test-"));
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

describe("NextclawNcpContextBuilder tool catalog", () => {
  it("injects runtime tool definitions into the system prompt", () => {
    const workspace = createWorkspace();
    const config = ConfigSchema.parse({
      agents: {
        defaults: {
          workspace,
          model: "default-model",
          contextTokens: 200000,
          maxToolIterations: 8,
        },
      },
    });
    const prepareForRun = vi.fn();
    const builder = new NextclawNcpContextBuilder({
      sessionManager: new SessionManager(workspace),
      toolRegistry: {
        prepareForRun,
        getToolDefinitions: () => [
          {
            name: "read_file",
            description: "Read file contents",
            parameters: { type: "object", properties: {}, additionalProperties: false },
          },
          {
            name: "feishu_doc",
            description: "Feishu document operations",
            parameters: { type: "object", properties: {}, additionalProperties: false },
          },
        ],
      } as never,
      getConfig: () => config,
    });

    const prepared = builder.prepare({
      sessionId: "session-1",
      messages: [
        {
          role: "user",
          timestamp: new Date("2026-03-25T10:00:00.000Z").toISOString(),
          parts: [{ type: "text", text: "hello" }],
        },
      ],
      metadata: {},
    } as never);

    const systemMessage = prepared.messages[0];
    expect(systemMessage?.role).toBe("system");
    expect(String(systemMessage?.content)).toContain("- feishu_doc: Feishu document operations");
    expect(prepareForRun).toHaveBeenCalledTimes(1);
  });
});
