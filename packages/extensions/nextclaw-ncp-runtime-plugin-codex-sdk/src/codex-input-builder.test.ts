import { readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as NextclawCoreModule from "@nextclaw/core";
import type { NcpAgentRunInput } from "@nextclaw/ncp";

const buildRequestedSkillsUserPromptMock = vi.hoisted(() => vi.fn((_loader, _skills, prompt) => prompt));
const skillsLoaderConstructorMock = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({
    listSkills: () => [],
  })),
);

vi.mock("@nextclaw/core", async (importOriginal) => {
  const actual = await importOriginal<typeof NextclawCoreModule>();
  return {
    ...actual,
    SkillsLoader: skillsLoaderConstructorMock,
    buildRequestedSkillsUserPrompt: buildRequestedSkillsUserPromptMock,
  };
});

import { buildCodexInputBuilder } from "./codex-input-builder.js";

const createdDirs: string[] = [];

afterEach(() => {
  vi.clearAllMocks();
  while (createdDirs.length > 0) {
    rmSync(createdDirs.pop() as string, { recursive: true, force: true });
  }
});

function createInput(parts: NcpAgentRunInput["messages"][number]["parts"]): NcpAgentRunInput {
  return {
    sessionId: "session-1",
    messages: [
      {
        id: "user-1",
        sessionId: "session-1",
        role: "user",
        status: "final",
        timestamp: new Date().toISOString(),
        parts,
      },
    ],
  };
}

describe("buildCodexInputBuilder", () => {
  it("appends materialized file paths for file parts", async () => {
    const builder = buildCodexInputBuilder("/tmp/workspace");
    const prompt = await builder(createInput([
      { type: "text", text: "check this image" },
      {
        type: "file",
        name: "photo.png",
        mimeType: "image/png",
        contentBase64: Buffer.from("png-data").toString("base64"),
      },
    ]));

    const match = prompt.match(/local file: (.+photo\.png)/);
    expect(prompt).toContain("Attached files for this turn:");
    expect(match?.[1]).toBeTruthy();
    const filePath = match?.[1] as string;
    createdDirs.push(dirname(filePath));
    expect(readFileSync(filePath, "utf8")).toBe("png-data");
  });

  it("adds a fallback prompt for attachment-only messages", async () => {
    const builder = buildCodexInputBuilder("/tmp/workspace");
    const prompt = await builder(createInput([
      {
        type: "file",
        name: "remote.png",
        mimeType: "image/png",
        url: "https://example.com/remote.png",
      },
    ]));

    expect(prompt).toContain("Please inspect the attached file(s) and respond.");
    expect(prompt).toContain("remote url: https://example.com/remote.png");
  });
});
