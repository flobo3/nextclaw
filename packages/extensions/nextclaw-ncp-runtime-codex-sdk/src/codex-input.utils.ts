import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import type { Thread } from "@openai/codex-sdk";
import type { NcpAgentRunInput, NcpMessagePart } from "@nextclaw/ncp";

export type CodexThreadInput = Parameters<Thread["runStreamed"]>[0];
type CodexUserInput = Exclude<CodexThreadInput, string>[number];

export type CodexAssetContentPathResolver = (
  assetUri: string,
) => Promise<string | null> | string | null;

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isImageMimeType(value: string | null): boolean {
  return value?.startsWith("image/") ?? false;
}

function readLatestUserMessageParts(input: NcpAgentRunInput): NcpMessagePart[] {
  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (message?.role !== "user") {
      continue;
    }
    if (message.parts.length > 0) {
      return message.parts;
    }
  }
  return [];
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

function formatImageAttachmentHint(part: Extract<NcpMessagePart, { type: "file" }>): string {
  const fileName = readOptionalString(part.name) ?? "asset";
  const mimeType = readOptionalString(part.mimeType) ?? "application/octet-stream";
  const assetUri = readOptionalString(part.assetUri);
  const sizeText =
    typeof part.sizeBytes === "number" && Number.isFinite(part.sizeBytes)
      ? String(part.sizeBytes)
      : null;

  return [
    `[Attached Image: ${fileName}]`,
    `[MIME: ${mimeType}]`,
    ...(assetUri ? [`[Asset URI: ${assetUri}]`] : []),
    ...(sizeText ? [`[Size Bytes: ${sizeText}]`] : []),
    assetUri
      ? "[Instruction: This image is embedded in the prompt. If you need to transform or process the original file with tools, use the asset URI.]"
      : "[Instruction: This image is embedded in the prompt.]",
  ].join("\n");
}

function resolveFileUrlToPath(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith("file://")) {
    try {
      return fileURLToPath(value);
    } catch {
      return null;
    }
  }

  return isAbsolute(value) ? value : null;
}

async function resolveLocalImagePath(
  part: Extract<NcpMessagePart, { type: "file" }>,
  resolveAssetContentPath: CodexAssetContentPathResolver | undefined,
): Promise<string | null> {
  if (!isImageMimeType(readOptionalString(part.mimeType))) {
    return null;
  }

  const assetUri = readOptionalString(part.assetUri);
  if (assetUri && resolveAssetContentPath) {
    const resolvedPath = readOptionalString(await resolveAssetContentPath(assetUri));
    if (resolvedPath) {
      return resolvedPath;
    }
  }

  return resolveFileUrlToPath(readOptionalString(part.url));
}

async function buildCodexPromptContent(
  parts: NcpMessagePart[],
  resolveAssetContentPath: CodexAssetContentPathResolver | undefined,
): Promise<{
  promptText: string;
  userInputs: CodexUserInput[];
}> {
  const promptBlocks: string[] = [];
  const userInputs: CodexUserInput[] = [];

  for (const part of parts) {
    if ((part.type === "text" || part.type === "rich-text") && part.text.trim().length > 0) {
      promptBlocks.push(part.text);
      continue;
    }

    if (part.type !== "file") {
      continue;
    }

    const localImagePath = await resolveLocalImagePath(part, resolveAssetContentPath);
    if (localImagePath) {
      promptBlocks.push(formatImageAttachmentHint(part));
      userInputs.push({
        type: "local_image",
        path: localImagePath,
      });
      continue;
    }

    promptBlocks.push(formatAssetReferenceBlock(part));
  }

  return {
    promptText: promptBlocks.join("\n\n").trim(),
    userInputs,
  };
}

export function buildCodexThreadInput(
  promptText: string,
  userInputs: CodexUserInput[],
): CodexThreadInput {
  const normalizedPrompt = promptText.trim();
  if (userInputs.length === 0) {
    return normalizedPrompt;
  }

  return [
    ...(normalizedPrompt
      ? [
          {
            type: "text" as const,
            text: normalizedPrompt,
          },
        ]
      : []),
    ...userInputs,
  ];
}

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

export function buildCodexInputBuilder(
  runtimeAgent: RuntimeAgentPromptBuilder,
  params: {
    workspace: string;
    hostWorkspace?: string;
    sessionMetadata?: Record<string, unknown>;
    resolveAssetContentPath?: CodexAssetContentPathResolver;
  },
) {
  return async (input: NcpAgentRunInput): Promise<CodexThreadInput> => {
    const { promptText, userInputs } = await buildCodexPromptContent(
      readLatestUserMessageParts(input),
      params.resolveAssetContentPath,
    );
    const metadata = {
      ...readMetadata(params.sessionMetadata),
      ...readMetadata(input.metadata),
    };
    const prompt = runtimeAgent.buildRuntimeUserPrompt({
      workspace: params.workspace,
      hostWorkspace: params.hostWorkspace,
      sessionKey: input.sessionId,
      metadata,
      userMessage: promptText,
    });
    return buildCodexThreadInput(prompt, userInputs);
  };
}

export async function buildCodexTurnInputFromRunInput(
  input: NcpAgentRunInput,
  options: {
    resolveAssetContentPath?: CodexAssetContentPathResolver;
  } = {},
): Promise<CodexThreadInput> {
  const { promptText, userInputs } = await buildCodexPromptContent(
    readLatestUserMessageParts(input),
    options.resolveAssetContentPath,
  );
  return buildCodexThreadInput(promptText, userInputs);
}
