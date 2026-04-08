import type { NcpAgentRunInput, NcpMessagePart } from "@nextclaw/ncp";

type RuntimeAgentPromptBuilder = {
  buildRuntimeUserPrompt: (params: {
    workspace?: string;
    hostWorkspace?: string;
    sessionKey?: string;
    metadata?: Record<string, unknown>;
    userMessage: string;
  }) => string;
};

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readUserText(input: NcpAgentRunInput): string {
  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (message?.role !== "user") {
      continue;
    }
    const text = message.parts
      .filter((part): part is Extract<typeof message.parts[number], { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatAssetReferenceBlock(part: Extract<NcpMessagePart, { type: "file" }>): string {
  const fileName = readOptionalString(part.name) ?? "asset";
  const mimeType = readOptionalString(part.mimeType) ?? "application/octet-stream";
  const assetUri = readOptionalString(part.assetUri);
  const url = readOptionalString(part.url);
  const sizeText =
    typeof part.sizeBytes === "number" && Number.isFinite(part.sizeBytes)
      ? String(part.sizeBytes)
      : null;

  return [
    `[Asset: ${fileName}]`,
    `[MIME: ${mimeType}]`,
    ...(assetUri ? [`[Asset URI: ${assetUri}]`] : []),
    ...(sizeText ? [`[Size Bytes: ${sizeText}]`] : []),
    ...(url ? [`[Preview URL: ${url}]`] : []),
    "[Instruction: This file is not embedded in the prompt. If you need to inspect or transform it, use asset_export to copy it to a normal file path first.]",
  ].join("\n");
}

function normalizeUserMessage(parts: NcpMessagePart[]): string {
  const blocks: string[] = [];
  for (const part of parts) {
    if ((part.type === "text" || part.type === "rich-text") && part.text.trim()) {
      blocks.push(part.text);
      continue;
    }
    if (part.type === "file") {
      blocks.push(formatAssetReferenceBlock(part));
    }
  }
  return blocks.join("\n\n").trim();
}

function readLatestUserMessage(input: NcpAgentRunInput): string {
  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (message?.role !== "user") {
      continue;
    }
    const normalized = normalizeUserMessage(message.parts);
    if (normalized) {
      return normalized;
    }
  }
  return readUserText(input);
}

export function buildCodexInputBuilder(
  runtimeAgent: RuntimeAgentPromptBuilder,
  params: {
    workspace: string;
    hostWorkspace?: string;
    sessionMetadata?: Record<string, unknown>;
  },
) {
  return async (input: NcpAgentRunInput): Promise<string> => {
    const userText = readLatestUserMessage(input);
    const metadata = {
      ...readMetadata(params.sessionMetadata),
      ...readMetadata(input.metadata),
    };
    const prompt = runtimeAgent.buildRuntimeUserPrompt({
      workspace: params.workspace,
      hostWorkspace: params.hostWorkspace,
      sessionKey: input.sessionId,
      metadata,
      userMessage: userText,
    });
    return prompt;
  };
}
