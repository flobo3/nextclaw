import type { NcpMessage, OpenAIContentPart } from "@nextclaw/ncp";
import type {
  NcpContextBuilder,
  NcpContextPrepareOptions,
  NcpLLMApiInput,
  NcpMessagePart,
  OpenAIChatMessage,
  OpenAITool,
} from "@nextclaw/ncp";
import type { NcpAgentRunInput } from "@nextclaw/ncp";
import type { NcpToolRegistry } from "@nextclaw/ncp";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRenderableImagePart(part: NcpMessage["parts"][number]): part is Extract<NcpMessage["parts"][number], { type: "file" }> {
  return (
    part.type === "file" &&
    typeof part.mimeType === "string" &&
    part.mimeType.startsWith("image/") &&
    ((typeof part.url === "string" && part.url.trim().length > 0) ||
      (typeof part.contentBase64 === "string" && part.contentBase64.trim().length > 0))
  );
}

function toOpenAIUserContent(parts: NcpMessage["parts"]): string | OpenAIContentPart[] {
  const content: OpenAIContentPart[] = [];

  for (const part of parts) {
    if (part.type === "text" && part.text.trim().length > 0) {
      content.push({ type: "text", text: part.text });
      continue;
    }
    if (part.type === "rich-text" && part.text.trim().length > 0) {
      content.push({ type: "text", text: part.text });
      continue;
    }
    if (!isRenderableImagePart(part)) {
      continue;
    }

    const url =
      typeof part.url === "string" && part.url.trim().length > 0
        ? part.url.trim()
        : `data:${part.mimeType};base64,${part.contentBase64?.trim() ?? ""}`;

    content.push({
      type: "image_url",
      image_url: {
        url,
      },
    });
  }

  if (content.length === 0) {
    return "";
  }

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text;
  }

  return content;
}

function isTextLikePart(part: NcpMessagePart): part is Extract<NcpMessagePart, { type: "text" | "rich-text" }> {
  return part.type === "text" || part.type === "rich-text";
}

function mergeMessageAndRequestMetadata(input: NcpAgentRunInput): Record<string, unknown> {
  const messageMetadata = input.messages
    .slice()
    .reverse()
    .find((message) => isRecord(message.metadata))?.metadata;
  return {
    ...(isRecord(messageMetadata) ? messageMetadata : {}),
    ...(isRecord(input.metadata) ? input.metadata : {}),
  };
}

function readRequestedToolNames(metadata: Record<string, unknown>): string[] {
  const raw =
    metadata.requested_tools ??
    metadata.requestedTools ??
    metadata.requested_skills ??
    metadata.requestedSkills;
  if (!Array.isArray(raw)) {
    return [];
  }
  const deduped = new Set<string>();
  for (const item of raw) {
    const value = readOptionalString(item);
    if (value) {
      deduped.add(value);
    }
  }
  return [...deduped];
}

function messageToOpenAI(msg: NcpMessage): OpenAIChatMessage[] {
  const role = msg.role as "user" | "assistant" | "system" | "tool";
  const parts = msg.parts ?? [];

  if (role === "user" || role === "system") {
    if (role === "user") {
      return [{ role, content: toOpenAIUserContent(parts) }];
    }
    const text = parts.filter(isTextLikePart).map((part) => part.text).join("");
    return [{ role, content: text }];
  }

  if (role === "assistant") {
    const texts: string[] = [];
    const reasonings: string[] = [];
    const toolInvocations: Array<{
      toolCallId: string;
      toolName: string;
      args: unknown;
      result: unknown;
    }> = [];

    for (const p of parts) {
      if (p.type === "reasoning") {
        reasonings.push(p.text);
      }
      if (p.type === "text") {
        texts.push(p.text);
      }
      if (p.type === "tool-invocation" && p.state === "result" && p.result !== undefined) {
        toolInvocations.push({
          toolCallId: p.toolCallId ?? "",
          toolName: p.toolName,
          args: p.args ?? {},
          result: p.result,
        });
      }
    }

    const text = texts.join("");
    const reasoning = reasonings.join("");
    const out: OpenAIChatMessage[] = [];

    if (toolInvocations.length > 0) {
      out.push({
        role: "assistant",
        content: text || null,
        ...(reasoning ? { reasoning_content: reasoning } : {}),
        tool_calls: toolInvocations.map((t) => ({
          id: t.toolCallId,
          type: "function" as const,
          function: {
            name: t.toolName,
            arguments:
              typeof t.args === "string" ? t.args : JSON.stringify(t.args ?? {}),
          },
        })),
      });
      for (const t of toolInvocations) {
        out.push({
          role: "tool",
          content: typeof t.result === "string" ? t.result : JSON.stringify(t.result),
          tool_call_id: t.toolCallId,
        });
      }
    } else {
      out.push({
        role: "assistant",
        content: text,
        ...(reasoning ? { reasoning_content: reasoning } : {}),
      });
    }
    return out;
  }

  return [];
}

export class DefaultNcpContextBuilder implements NcpContextBuilder {
  constructor(private readonly toolRegistry?: NcpToolRegistry) {}

  prepare = (
    input: NcpAgentRunInput,
    options?: NcpContextPrepareOptions,
  ): NcpLLMApiInput => {
    const maxMessages = options?.maxMessages ?? 50;
    const sessionMessages = options?.sessionMessages ?? [];
    const systemPrompt = options?.systemPrompt;

    const requestMetadata = mergeMessageAndRequestMetadata(input);
    const requestedToolNames = readRequestedToolNames(requestMetadata);

    const messages: OpenAIChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    for (const msg of sessionMessages.slice(-maxMessages)) {
      messages.push(...messageToOpenAI(msg));
    }

    for (const msg of input.messages) {
      messages.push(...messageToOpenAI(msg));
    }

    const toolDefinitions = this.toolRegistry?.getToolDefinitions() ?? [];
    const filteredToolDefinitions =
      requestedToolNames.length > 0
        ? toolDefinitions.filter((definition) => requestedToolNames.includes(definition.name))
        : toolDefinitions;
    const tools: OpenAITool[] | undefined = filteredToolDefinitions.map((definition) => ({
      type: "function" as const,
      function: {
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters,
      },
    }));

    return {
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      model:
        readOptionalString(requestMetadata.model) ??
        readOptionalString(requestMetadata.llm_model) ??
        readOptionalString(requestMetadata.agent_model) ??
        undefined,
      thinkingLevel:
        readOptionalString(requestMetadata.thinking) ??
        readOptionalString(requestMetadata.thinking_level) ??
        readOptionalString(requestMetadata.thinkingLevel) ??
        readOptionalString(requestMetadata.thinking_effort) ??
        readOptionalString(requestMetadata.thinkingEffort) ??
        null,
    };
  };
}
