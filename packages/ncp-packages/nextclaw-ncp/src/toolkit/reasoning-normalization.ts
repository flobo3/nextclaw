export type NcpAssistantReasoningNormalizationMode = "off" | "think-tags";

export type NcpAssistantReasoningSegment = {
  type: "text" | "reasoning";
  text: string;
};

const THINK_OPEN_TAG = "<think>";
const THINK_CLOSE_TAG = "</think>";
const FINAL_OPEN_TAG = "<final>";
const FINAL_CLOSE_TAG = "</final>";
const LEADING_CONTROL_TAGS = [THINK_CLOSE_TAG, FINAL_OPEN_TAG, FINAL_CLOSE_TAG] as const;
const MAX_REASONING_DELIMITER_TAIL = THINK_CLOSE_TAG.length - 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function normalizeMode(value: unknown): NcpAssistantReasoningNormalizationMode | null {
  if (value === "off" || value === "think-tags") {
    return value;
  }
  return null;
}

function readLeadingThinkTagState(
  buffer: string,
): { status: "matched"; consumed: number } | { status: "pending" | "rejected" } {
  let cursor = 0;
  while (cursor < buffer.length && isWhitespace(buffer[cursor]!)) {
    cursor += 1;
  }

  const rest = buffer.slice(cursor);
  if (rest.startsWith(THINK_OPEN_TAG)) {
    return {
      status: "matched",
      consumed: cursor + THINK_OPEN_TAG.length,
    };
  }
  if (THINK_OPEN_TAG.startsWith(rest)) {
    return { status: "pending" };
  }
  return { status: "rejected" };
}

function stripLeadingControlTags(buffer: string): { buffer: string; pending: boolean } {
  let nextBuffer = buffer;

  while (true) {
    let cursor = 0;
    while (cursor < nextBuffer.length && isWhitespace(nextBuffer[cursor]!)) {
      cursor += 1;
    }

    const rest = nextBuffer.slice(cursor);
    if (rest.length === 0) {
      return { buffer: "", pending: false };
    }

    const matchedTag = LEADING_CONTROL_TAGS.find((tag) => rest.startsWith(tag));
    if (matchedTag) {
      nextBuffer = rest.slice(matchedTag.length);
      continue;
    }

    if (LEADING_CONTROL_TAGS.some((tag) => tag.startsWith(rest))) {
      return { buffer: rest, pending: true };
    }

    return { buffer: rest, pending: false };
  }
}

function findReasoningBoundary(buffer: string): { index: number; tag: string } | null {
  const indices = [
    { index: buffer.indexOf(THINK_CLOSE_TAG), tag: THINK_CLOSE_TAG },
    { index: buffer.indexOf(FINAL_OPEN_TAG), tag: FINAL_OPEN_TAG },
  ].filter((entry) => entry.index >= 0);

  if (indices.length === 0) {
    return null;
  }

  return indices.reduce((left, right) => (right.index < left.index ? right : left));
}

export function readAssistantReasoningNormalizationMode(
  value: unknown,
): NcpAssistantReasoningNormalizationMode | null {
  if (typeof value === "string") {
    return normalizeMode(value);
  }
  if (isRecord(value)) {
    return normalizeMode(value.mode);
  }
  return null;
}

export function readAssistantReasoningNormalizationModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): NcpAssistantReasoningNormalizationMode | null {
  if (!metadata) {
    return null;
  }
  return (
    readAssistantReasoningNormalizationMode(metadata.reasoning_normalization) ??
    readAssistantReasoningNormalizationMode(metadata.reasoningNormalization) ??
    normalizeMode(metadata.reasoning_normalization_mode) ??
    normalizeMode(metadata.reasoningNormalizationMode)
  );
}

export function writeAssistantReasoningNormalizationModeToMetadata(
  metadata: Record<string, unknown>,
  mode: NcpAssistantReasoningNormalizationMode,
): Record<string, unknown> {
  const nextMetadata = {
    ...metadata,
  };
  delete nextMetadata.reasoningNormalization;
  delete nextMetadata.reasoningNormalizationMode;
  delete nextMetadata.reasoning_normalization_mode;
  nextMetadata.reasoning_normalization = { mode };
  return nextMetadata;
}

export class NcpAssistantTextStreamNormalizer {
  private buffer = "";
  private phase: "initial" | "reasoning" | "text" = "initial";
  private stripLeadingTextControlTags = false;

  constructor(private readonly mode: NcpAssistantReasoningNormalizationMode = "off") {}

  push(delta: string): NcpAssistantReasoningSegment[] {
    if (!delta) {
      return [];
    }
    if (this.mode !== "think-tags") {
      return [{ type: "text", text: delta }];
    }

    this.buffer += delta;
    return this.flush(false);
  }

  finish(): NcpAssistantReasoningSegment[] {
    if (this.mode !== "think-tags") {
      return [];
    }
    return this.flush(true);
  }

  private flush(final: boolean): NcpAssistantReasoningSegment[] {
    const segments: NcpAssistantReasoningSegment[] = [];

    while (true) {
      if (this.phase === "initial") {
        const leadingState = readLeadingThinkTagState(this.buffer);
        if (leadingState.status === "matched") {
          this.buffer = this.buffer.slice(leadingState.consumed);
          this.phase = "reasoning";
          continue;
        }
        if (leadingState.status === "pending" && !final) {
          return segments;
        }
        this.phase = "text";
        continue;
      }

      if (this.phase === "reasoning") {
        const boundary = findReasoningBoundary(this.buffer);
        if (boundary) {
          const reasoningText = this.buffer.slice(0, boundary.index);
          if (reasoningText.length > 0) {
            segments.push({ type: "reasoning", text: reasoningText });
          }
          this.buffer = this.buffer.slice(boundary.index + boundary.tag.length);
          this.phase = "text";
          this.stripLeadingTextControlTags = true;
          continue;
        }

        const safeLength = final ? this.buffer.length : Math.max(0, this.buffer.length - MAX_REASONING_DELIMITER_TAIL);
        if (safeLength === 0) {
          return segments;
        }
        segments.push({
          type: "reasoning",
          text: this.buffer.slice(0, safeLength),
        });
        this.buffer = this.buffer.slice(safeLength);
        if (!final) {
          return segments;
        }
        continue;
      }

      if (this.stripLeadingTextControlTags) {
        const stripped = stripLeadingControlTags(this.buffer);
        if (stripped.pending && !final) {
          this.buffer = stripped.buffer;
          return segments;
        }
        this.buffer = stripped.buffer;
        this.stripLeadingTextControlTags = false;
      }

      if (this.buffer.length === 0) {
        return segments;
      }

      segments.push({
        type: "text",
        text: this.buffer,
      });
      this.buffer = "";
      return segments;
    }
  }
}

export function normalizeAssistantText(
  text: string,
  mode: NcpAssistantReasoningNormalizationMode,
): {
  text: string;
  reasoning: string;
  parts: NcpAssistantReasoningSegment[];
} {
  const normalizer = new NcpAssistantTextStreamNormalizer(mode);
  const parts = [...normalizer.push(text), ...normalizer.finish()].filter((part) => part.text.length > 0);

  return {
    text: parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(""),
    reasoning: parts
      .filter((part) => part.type === "reasoning")
      .map((part) => part.text)
      .join(""),
    parts,
  };
}
