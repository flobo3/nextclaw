import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { ContextBuilder } from "./context.js";

const tempWorkspaces: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "nextclaw-context-test-"));
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

describe("ContextBuilder tool catalog", () => {
  it("renders the runtime tool catalog into the system prompt", () => {
    const workspace = createWorkspace();
    const builder = new ContextBuilder(workspace);

    const prompt = builder.buildSystemPrompt(undefined, undefined, undefined, [
      { name: "read_file", description: "Read file contents" },
      { name: "feishu_doc", description: "Feishu document operations" },
      { name: "feishu_wiki", description: "Feishu knowledge base operations" },
    ]);

    expect(prompt).toContain("- read_file: Read file contents");
    expect(prompt).toContain("- feishu_doc: Feishu document operations");
    expect(prompt).toContain("- feishu_wiki: Feishu knowledge base operations");
    expect(prompt).not.toContain("- gateway: Restart/apply config/update running process");
  });
});
