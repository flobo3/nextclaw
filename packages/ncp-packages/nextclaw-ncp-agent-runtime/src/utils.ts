import AjvPkg, { type ErrorObject, type ValidateFunction } from "ajv";
import type {
  NcpInvalidToolArgumentsResult,
  NcpLLMApiInput,
  NcpToolCallResult,
  OpenAIChatMessage,
} from "@nextclaw/ncp";

export type ParsedToolArgs =
  | {
      ok: true;
      rawText: string;
      value: Record<string, unknown>;
    }
  | {
      ok: false;
      rawText: string;
      issues: string[];
    };

const AjvCtor = AjvPkg as unknown as new (opts?: object) => AjvLike;

type AjvLike = {
  compile: (schema: Record<string, unknown>) => ValidateFunction;
};

const toolSchemaValidator = new AjvCtor({
  allErrors: true,
  strict: false,
  removeAdditional: false,
});
const validatorCache = new WeakMap<Record<string, unknown>, ValidateFunction>();

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function stringifyRawArgs(args: unknown): string {
  if (typeof args === "string") {
    return args;
  }
  if (args && typeof args === "object" && !Array.isArray(args)) {
    try {
      return JSON.stringify(args);
    } catch {
      return "[unserializable-object]";
    }
  }
  return String(args ?? "");
}

export function parseToolArgs(args: unknown): ParsedToolArgs {
  if (args && typeof args === "object" && !Array.isArray(args)) {
    return {
      ok: true,
      rawText: stringifyRawArgs(args),
      value: args as Record<string, unknown>,
    };
  }

  const rawText = stringifyRawArgs(args);
  if (typeof args !== "string") {
    return {
      ok: false,
      rawText,
      issues: ["Tool arguments must be a JSON object string."],
    };
  }

  const trimmed = args.trim();
  if (!trimmed) {
    return {
      ok: false,
      rawText,
      issues: ["Tool arguments are empty."],
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        rawText,
        issues: ["Tool arguments JSON must decode to an object."],
      };
    }
    return {
      ok: true,
      rawText,
      value: parsed as Record<string, unknown>,
    };
  } catch (error) {
    return {
      ok: false,
      rawText,
      issues: [error instanceof Error ? error.message : "Failed to parse tool arguments JSON."],
    };
  }
}

export function validateToolArgs(
  args: Record<string, unknown>,
  schema: Record<string, unknown> | undefined,
): string[] {
  if (!schema) {
    return [];
  }
  const validate = getOrCreateValidator(schema);
  const valid = validate(args);
  if (valid) {
    return [];
  }
  return formatSchemaIssues(validate.errors);
}

function getOrCreateValidator(schema: Record<string, unknown>): ValidateFunction {
  const cached = validatorCache.get(schema);
  if (cached) {
    return cached;
  }
  const validate = toolSchemaValidator.compile(schema);
  validatorCache.set(schema, validate);
  return validate;
}

function formatSchemaIssues(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return ["Tool arguments do not match the declared schema."];
  }

  return errors.map((error) => {
    const instancePath = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
    if (
      error.keyword === "required" &&
      "missingProperty" in error.params &&
      typeof error.params.missingProperty === "string"
    ) {
      const missingPath = instancePath
        ? `${instancePath}.${error.params.missingProperty}`
        : error.params.missingProperty;
      return `${missingPath} is required`;
    }
    if (
      error.keyword === "additionalProperties" &&
      "additionalProperty" in error.params &&
      typeof error.params.additionalProperty === "string"
    ) {
      const extraPath = instancePath
        ? `${instancePath}.${error.params.additionalProperty}`
        : error.params.additionalProperty;
      return `${extraPath} is not allowed`;
    }
    const label = instancePath || "parameter";
    return `${label}: ${error.message ?? "invalid"}`;
  });
}

export function createInvalidToolArgumentsResult(params: {
  toolCallId: string;
  toolName: string;
  rawArgumentsText: string;
  issues: string[];
}): NcpInvalidToolArgumentsResult {
  return {
    ok: false,
    error: {
      code: "invalid_tool_arguments",
      message: "Tool arguments are invalid.",
      toolCallId: params.toolCallId,
      toolName: params.toolName,
      rawArgumentsText: params.rawArgumentsText,
      issues: params.issues,
    },
  };
}

export function createToolExecutionFailedResult(params: {
  toolCallId: string;
  toolName: string;
  error: unknown;
}): {
  ok: false;
  error: {
    code: "tool_execution_failed";
    message: string;
    toolCallId: string;
    toolName: string;
  };
} {
  const { toolCallId, toolName, error } = params;
  return {
    ok: false,
    error: {
      code: "tool_execution_failed",
      message: error instanceof Error ? error.message : String(error),
      toolCallId,
      toolName,
    },
  };
}

export function appendToolRoundToInput(
  input: NcpLLMApiInput,
  reasoning: string,
  text: string,
  toolResults: ReadonlyArray<NcpToolCallResult>,
): NcpLLMApiInput {
  const assistantMsg: OpenAIChatMessage = {
    role: "assistant",
    content: text || null,
    ...(reasoning ? { reasoning_content: reasoning } : {}),
    tool_calls: toolResults.map((tr) => ({
      id: tr.toolCallId,
      type: "function" as const,
      function: {
        name: tr.toolName,
        arguments: tr.rawArgsText,
      },
    })),
  };
  const toolMsgs: OpenAIChatMessage[] = toolResults.map((tr) => ({
    role: "tool" as const,
    content:
      typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result ?? {}),
    tool_call_id: tr.toolCallId,
  }));
  return {
    ...input,
    messages: [...input.messages, assistantMsg, ...toolMsgs],
  };
}
