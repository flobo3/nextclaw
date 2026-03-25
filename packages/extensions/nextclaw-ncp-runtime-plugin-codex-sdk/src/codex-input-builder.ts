import {
  buildRequestedSkillsUserPrompt,
  SkillsLoader,
} from "@nextclaw/core";
import type { NcpAgentRunInput, NcpMessage } from "@nextclaw/ncp";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readRequestedSkills(metadata: Record<string, unknown>): string[] {
  const raw = metadata.requested_skills ?? metadata.requestedSkills;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => readString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 8);
}

function readUserText(input: NcpAgentRunInput): string {
  const message = readLatestUserMessage(input);
  if (!message) {
    return "";
  }
  return message.parts
    .filter((part): part is Extract<typeof message.parts[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

function readLatestUserMessage(input: NcpAgentRunInput): NcpMessage | null {
  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (message?.role !== "user") {
      continue;
    }
    return message;
  }
  return null;
}

function sanitizeFileName(name: string): string {
  const sanitized = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
  return sanitized || "attachment";
}

function buildAttachmentPrompt(message: NcpMessage | null): string {
  if (!message) {
    return "";
  }
  const fileParts = message.parts.filter((part): part is Extract<typeof message.parts[number], { type: "file" }> => part.type === "file");
  if (fileParts.length === 0) {
    return "";
  }

  const tempDir = mkdtempSync(join(tmpdir(), "nextclaw-codex-files-"));
  const lines = fileParts.map((part, index) => {
    const rawName = readString(part.name) ?? `attachment-${index + 1}`;
    const fileName = sanitizeFileName(rawName);
    const mimeSegment = readString(part.mimeType) ? ` (${part.mimeType})` : "";
    const contentBase64 = readString(part.contentBase64);
    if (contentBase64) {
      const filePath = join(tempDir, fileName);
      writeFileSync(filePath, Buffer.from(contentBase64.replace(/\s+/g, ""), "base64"));
      return `- ${fileName}${mimeSegment} -> local file: ${filePath}`;
    }
    if (readString(part.url)) {
      return `- ${fileName}${mimeSegment} -> remote url: ${part.url}`;
    }
    return `- ${fileName}${mimeSegment}`;
  });

  return ["Attached files for this turn:", ...lines].join("\n");
}

export function buildCodexInputBuilder(workspace: string) {
  const skillsLoader = new SkillsLoader(workspace);
  return async (input: NcpAgentRunInput): Promise<string> => {
    const userText = readUserText(input);
    const attachmentPrompt = buildAttachmentPrompt(readLatestUserMessage(input));
    const promptBody = [userText || (attachmentPrompt ? "Please inspect the attached file(s) and respond." : ""), attachmentPrompt]
      .filter(Boolean)
      .join("\n\n");
    const metadata =
      input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : {};
    const requestedSkills = readRequestedSkills(metadata);
    return buildRequestedSkillsUserPrompt(skillsLoader, requestedSkills, promptBody);
  };
}
