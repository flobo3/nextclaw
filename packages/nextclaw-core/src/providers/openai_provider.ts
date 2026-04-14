import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { LLMProvider, type LLMResponse, type LLMStreamEvent } from "./base.js";
import {
  ChatCompletionsPayloadError,
  normalizeChatCompletionsResponse,
  normalizeStructuredUsageCounters
} from "./chat-completions-normalizer.js";
import {
  buildOpenAiApiBaseCandidates,
  createEmptyChatCompletionsPayloadError,
  isSemanticallyEmptyOpenAiResponse,
  normalizeOpenAiResponsesOutput,
} from "../utils/openai/response.utils.js";
import {
  createOpenAiChatCompletionsStreamState,
  consumeOpenAiChatCompletionsChunk,
  finalizeOpenAiChatCompletionsStreamResponse,
  mergeOpenAiUsageCounters,
} from "../utils/openai/stream.utils.js";
import type { ThinkingLevel } from "../utils/thinking.js";
import { mapThinkingLevelToOpenAIReasoningEffort } from "../utils/thinking.js";

export type OpenAIProviderOptions = {
  apiKey?: string | null;
  apiBase?: string | null;
  defaultModel: string;
  extraHeaders?: Record<string, string> | null;
  wireApi?: "auto" | "chat" | "responses" | null;
  enableResponsesFallback?: boolean;
};

export class OpenAICompatibleProvider extends LLMProvider {
  private clientPool = new Map<string, OpenAI>();
  private defaultModel: string;
  private extraHeaders?: Record<string, string> | null;
  private wireApi: "auto" | "chat" | "responses";
  private enableResponsesFallback: boolean;
  private apiBaseCandidates: Array<string | null>;

  constructor(options: OpenAIProviderOptions) {
    super(options.apiKey, options.apiBase);
    this.defaultModel = options.defaultModel;
    this.extraHeaders = options.extraHeaders ?? null;
    this.wireApi = options.wireApi ?? "auto";
    this.enableResponsesFallback = options.enableResponsesFallback ?? true;
    this.apiBaseCandidates = buildOpenAiApiBaseCandidates(options.apiBase ?? null);
  }

  getDefaultModel = (): string => {
    return this.defaultModel;
  };

  chat = async (params: {
    messages: Array<Record<string, unknown>>;
    tools?: Array<Record<string, unknown>>;
    model?: string | null;
    maxTokens?: number;
    thinkingLevel?: ThinkingLevel | null;
    signal?: AbortSignal;
  }): Promise<LLMResponse> => {
    if (this.wireApi === "chat") {
      return this.chatCompletions(params);
    }
    if (this.wireApi === "responses") {
      return this.chatResponses(params);
    }
    try {
      return await this.chatCompletions(params);
    } catch (error) {
      if (this.shouldFallbackToResponses(error)) {
        return await this.chatResponses(params);
      }
      throw error;
    }
  };

  chatStream = (params: {
    messages: Array<Record<string, unknown>>;
    tools?: Array<Record<string, unknown>>;
    model?: string | null;
    maxTokens?: number;
    thinkingLevel?: ThinkingLevel | null;
    signal?: AbortSignal;
  }): AsyncGenerator<LLMStreamEvent> => {
    return (async function* (provider: OpenAICompatibleProvider): AsyncGenerator<LLMStreamEvent> {
      if (provider.wireApi === "chat") {
        for await (const event of provider.chatCompletionsStream(params)) {
          yield event;
        }
        return;
      }
      if (provider.wireApi === "responses") {
        const response = await provider.chatResponses(params);
        yield { type: "done", response };
        return;
      }
      try {
        for await (const event of provider.chatCompletionsStream(params)) {
          yield event;
        }
      } catch (error) {
        if (!provider.shouldFallbackToResponses(error)) {
          throw error;
        }
        const response = await provider.chatResponses(params);
        yield { type: "done", response };
      }
    })(this);
  };

  private chatCompletions = async (params: {
    messages: Array<Record<string, unknown>>;
    tools?: Array<Record<string, unknown>>;
    model?: string | null;
    maxTokens?: number;
    thinkingLevel?: ThinkingLevel | null;
    signal?: AbortSignal;
  }): Promise<LLMResponse> => {
    const model = params.model ?? this.defaultModel;
    let lastError: unknown = null;

    for (const apiBase of this.apiBaseCandidates) {
      try {
        const response = await this.withRetry(async () =>
          this.getClient(apiBase).chat.completions.create({
            model,
            messages: params.messages as unknown as ChatCompletionMessageParam[],
            tools: params.tools as ChatCompletionTool[] | undefined,
            tool_choice: params.tools?.length ? "auto" : undefined,
            ...(typeof params.maxTokens === "number" ? { max_tokens: params.maxTokens } : {})
          }, params.signal ? { signal: params.signal } : undefined)
        );

        const normalized = normalizeChatCompletionsResponse(
          response,
          (raw) => this.parseToolCallArguments(raw)
        );
        if (isSemanticallyEmptyOpenAiResponse(normalized)) {
          throw createEmptyChatCompletionsPayloadError(apiBase);
        }
        return normalized;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? createEmptyChatCompletionsPayloadError(this.apiBaseCandidates.at(-1) ?? null);
  };

  private chatCompletionsStream = (params: {
    messages: Array<Record<string, unknown>>;
    tools?: Array<Record<string, unknown>>;
    model?: string | null;
    maxTokens?: number;
    thinkingLevel?: ThinkingLevel | null;
    signal?: AbortSignal;
  }): AsyncGenerator<LLMStreamEvent> => {
    return (async function* (provider: OpenAICompatibleProvider): AsyncGenerator<LLMStreamEvent> {
      const model = params.model ?? provider.defaultModel;
      let lastError: unknown = null;

      for (const apiBase of provider.apiBaseCandidates) {
        try {
          const stream = await provider.withRetry(async () =>
            provider.getClient(apiBase).chat.completions.create({
              model,
              messages: params.messages as unknown as ChatCompletionMessageParam[],
              tools: params.tools as ChatCompletionTool[] | undefined,
              tool_choice: params.tools?.length ? "auto" : undefined,
              ...(typeof params.maxTokens === "number" ? { max_tokens: params.maxTokens } : {}),
              stream: true,
              stream_options: {
                include_usage: true
              }
            }, params.signal ? { signal: params.signal } : undefined)
          );
          const state = createOpenAiChatCompletionsStreamState();

          for await (const chunk of stream) {
            for (const event of consumeOpenAiChatCompletionsChunk({
              chunk: chunk as unknown as Record<string, unknown>,
              state,
              mergeUsageCounters: provider.mergeUsageCounters,
            })) {
              yield event;
            }
          }

          const response = finalizeOpenAiChatCompletionsStreamResponse({
            state,
            parseToolCallArguments: provider.parseToolCallArguments,
          });
          if (isSemanticallyEmptyOpenAiResponse(response)) {
            throw createEmptyChatCompletionsPayloadError(apiBase);
          }

          yield {
            type: "done",
            response
          };
          return;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError ?? createEmptyChatCompletionsPayloadError(provider.apiBaseCandidates.at(-1) ?? null);
    })(this);
  };

  private chatResponses = async (params: {
    messages: Array<Record<string, unknown>>;
    tools?: Array<Record<string, unknown>>;
    model?: string | null;
    maxTokens?: number;
    thinkingLevel?: ThinkingLevel | null;
    signal?: AbortSignal;
  }): Promise<LLMResponse> => {
    const model = params.model ?? this.defaultModel;
    const input = this.toResponsesInput(params.messages);
    const body: Record<string, unknown> = { model, input: input as unknown };
    const reasoningEffort = mapThinkingLevelToOpenAIReasoningEffort(params.thinkingLevel);
    if (reasoningEffort) {
      body.reasoning = { effort: reasoningEffort };
    }
    if (params.tools && params.tools.length) {
      body.tools = params.tools as unknown;
    }

    let lastError: unknown = null;

    for (const apiBase of this.apiBaseCandidates) {
      const base = apiBase ?? "https://api.openai.com/v1";
      const responseUrl = new URL("responses", base.endsWith("/") ? base : `${base}/`);

      try {
        const response = await this.withRetry(async () => {
          const attempt = await fetch(responseUrl.toString(), {
            method: "POST",
            headers: {
              "Authorization": this.apiKey ? `Bearer ${this.apiKey}` : "",
              "Content-Type": "application/json",
              ...(this.extraHeaders ?? {})
            },
            body: JSON.stringify(body),
            signal: params.signal
          });

          if (!attempt.ok) {
            const text = await attempt.text();
            const preview = text.slice(0, 200);
            const error = new Error(
              `Responses API failed (${attempt.status}): ${preview}`
            ) as Error & { status?: number; responseUrl?: string; bodyPreview?: string };
            error.status = attempt.status;
            error.responseUrl = responseUrl.toString();
            error.bodyPreview = preview;
            throw error;
          }

          return attempt;
        });

        const rawText = await response.text();
        const responseAny = this.parseResponsesPayload(rawText) as {
          output?: Array<Record<string, unknown>>;
          usage?: Record<string, number>;
          status?: string;
        };
        const normalized = normalizeOpenAiResponsesOutput({
          ...responseAny,
          usage: this.normalizeUsageCounters(responseAny.usage as Record<string, unknown> | undefined),
        });
        if (isSemanticallyEmptyOpenAiResponse(normalized)) {
          throw new Error(
            `Responses API returned an empty assistant response${apiBase ? ` for base "${apiBase}"` : ""}.`
          );
        }
        return normalized;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Responses API returned an empty assistant response.");
  };

  private parseResponsesPayload = (rawText: string): Record<string, unknown> => {
    const text = rawText.replace(/^\uFEFF/, "").trim();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      const leadingJson = this.extractLeadingJson(text);
      if (leadingJson) {
        try {
          return JSON.parse(leadingJson) as Record<string, unknown>;
        } catch {
          // continue to SSE fallback
        }
      }

      const sseJson = this.extractSseJson(text);
      if (sseJson) {
        return this.unwrapResponsesEnvelope(sseJson);
      }

      throw new Error(`Responses API returned non-JSON payload: ${text.slice(0, 240)}`);
    }
  };

  private extractLeadingJson = (text: string): string | null => {
    let start = -1;
    for (let index = 0; index < text.length; index += 1) {
      const ch = text[index];
      if (!/\s/.test(ch)) {
        if (ch !== "{" && ch !== "[") {
          return null;
        }
        start = index;
        break;
      }
    }

    if (start === -1) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const ch = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === "{" || ch === "[") {
        depth += 1;
        continue;
      }
      if (ch === "}" || ch === "]") {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, index + 1);
        }
      }
    }

    return null;
  };

  private extractSseJson = (text: string): Record<string, unknown> | null => {
    const lines = text.split(/\r?\n/);
    let latestJson: Record<string, unknown> | null = null;
    let latestResponse: Record<string, unknown> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }
      try {
        const parsed = JSON.parse(payload) as Record<string, unknown>;
        latestJson = parsed;
        if (Array.isArray(parsed.output)) {
          latestResponse = parsed;
          continue;
        }
        const response = parsed.response;
        if (response && typeof response === "object" && !Array.isArray(response)) {
          latestResponse = response as Record<string, unknown>;
        }
      } catch {
        // ignore non-json data frame
      }
    }

    return latestResponse ?? latestJson;
  };

  private unwrapResponsesEnvelope = (payload: Record<string, unknown>): Record<string, unknown> => {
    const response = payload.response;
    if (response && typeof response === "object" && !Array.isArray(response)) {
      return response as Record<string, unknown>;
    }
    return payload;
  };

  private shouldFallbackToResponses = (error: unknown): boolean => {
    if (!this.enableResponsesFallback) return false;
    const err = error as { status?: number; message?: string; code?: string };
    const status = err?.status;
    const message = err?.message ?? "";
    const code = err?.code ?? (error instanceof ChatCompletionsPayloadError ? error.code : "");
    if (status === 404) {
      return true;
    }
    if (code === "INVALID_CHAT_COMPLETIONS_PAYLOAD") {
      return true;
    }
    if (message.includes("Cannot POST") && message.includes("chat/completions")) {
      return true;
    }
    if (message.includes("chat/completions") && message.includes("404")) {
      return true;
    }
    return false;
  };

  private parseToolCallArguments = (raw: unknown): Record<string, unknown> => {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }

    if (typeof raw !== "string") {
      return {};
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return {};
    }

    const candidates = [trimmed, this.stripCodeFence(trimmed), this.extractLeadingJson(trimmed)].filter(
      (value): value is string => Boolean(value)
    );

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // continue trying next candidate
      }
    }

    return {};
  };

  private stripCodeFence = (text: string): string => {
    const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fence?.[1]?.trim() ?? text;
  };

  private normalizeUsageCounters = (raw: Record<string, unknown> | undefined): Record<string, number> => {
    return normalizeStructuredUsageCounters(raw, {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    });
  };

  private mergeUsageCounters = (
    current: Record<string, number>,
    incoming: Record<string, unknown>
  ): Record<string, number> => {
    return mergeOpenAiUsageCounters(current, incoming);
  };

  private withRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await operation();
      } catch (error) {
        if (attempt >= maxAttempts || !this.isTransientError(error)) {
          throw error;
        }
        await this.sleep(250 * attempt);
      }
    }

    throw new Error("Retry attempts exhausted");
  };

  private isTransientError = (error: unknown): boolean => {
    const err = error as {
      status?: number;
      code?: string;
      message?: string;
      cause?: { code?: string; message?: string };
    };
    const status = err?.status;
    if (typeof status === "number" && (status === 429 || status >= 500)) {
      return true;
    }

    const code = `${err?.code ?? err?.cause?.code ?? ""}`.toUpperCase();
    if (code && ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "UND_ERR_SOCKET"].includes(code)) {
      return true;
    }

    const message = `${err?.message ?? err?.cause?.message ?? ""}`.toLowerCase();
    return (
      message.includes("fetch failed") ||
      message.includes("socket hang up") ||
      message.includes("timed out") ||
      message.includes("temporarily unavailable")
    );
  };

  private sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  private getClient = (apiBase: string | null): OpenAI => {
    const key = apiBase?.trim() || "__default__";
    const existing = this.clientPool.get(key);
    if (existing) {
      return existing;
    }

    const created = new OpenAI({
      apiKey: this.apiKey ?? undefined,
      baseURL: apiBase ?? undefined,
      defaultHeaders: this.extraHeaders ?? undefined
    });
    this.clientPool.set(key, created);
    return created;
  };

  private toResponsesInput = (messages: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
    const input: Array<Record<string, unknown>> = [];
    for (const msg of messages) {
      const role = String(msg.role ?? "user");
      const content = msg.content;
      if (role === "tool") {
        const callId = typeof msg.tool_call_id === "string" ? msg.tool_call_id : "";
        const outputText =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? JSON.stringify(content)
              : String(content ?? "");
        input.push({
          type: "function_call_output",
          call_id: callId,
          output: outputText
        });
        continue;
      }

      const output: Record<string, unknown> = { role };
      output.content = this.normalizeResponsesContent(content);

      if (typeof msg.reasoning_content === "string" && msg.reasoning_content) {
        output.reasoning = msg.reasoning_content;
      }

      input.push(output);

      if (Array.isArray(msg.tool_calls)) {
        for (const call of msg.tool_calls as Array<Record<string, unknown>>) {
          const callAny = call as Record<string, unknown>;
          const functionAny = (callAny.function as Record<string, unknown> | undefined) ?? {};
          const callId = String(callAny.id ?? callAny.call_id ?? "");
          const name = String(functionAny.name ?? callAny.name ?? "");
          const args = String(functionAny.arguments ?? callAny.arguments ?? "{}");
          if (!callId || !name) {
            continue;
          }
          input.push({
            type: "function_call",
            name,
            arguments: args,
            call_id: callId
          });
        }
      }
    }

    return input;
  };

  private normalizeResponsesContent = (content: unknown): string | Array<Record<string, unknown>> => {
    if (typeof content === "string") {
      return [{ type: "input_text", text: content }];
    }
    if (!Array.isArray(content)) {
      return String(content ?? "");
    }

    const blocks: Array<Record<string, unknown>> = [];
    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const partAny = part as Record<string, unknown>;
      const type = String(partAny.type ?? "");
      if (type === "text" || type === "output_text" || type === "input_text") {
        const textValue = typeof partAny.text === "string" ? partAny.text : "";
        if (textValue) {
          blocks.push({ type: "input_text", text: textValue });
        }
        continue;
      }
      if (type === "image_url" || type === "input_image") {
        const imageValue = partAny.image_url as string | { url?: string } | undefined;
        const imageUrl =
          typeof imageValue === "string"
            ? imageValue
            : imageValue && typeof imageValue === "object" && typeof imageValue.url === "string"
              ? imageValue.url
              : undefined;
        if (imageUrl) {
          blocks.push({ type: "input_image", image_url: imageUrl });
        }
      }
    }

    if (blocks.length > 0) {
      return blocks;
    }
    return String(content ?? "");
  };
}
