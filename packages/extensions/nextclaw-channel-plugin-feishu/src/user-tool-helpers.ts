import { Type, type SchemaOptions, type TSchema } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { AppScopeMissingError, UserAuthRequiredError, UserScopeInsufficientError } from "./auth-errors.js";
import { openPlatformDomain } from "./domains.js";
import { formatLarkError } from "./user-tool-result.js";
import { getAllKnownScopes } from "./tool-scopes.js";
import { createUserToolClient } from "./user-tool-client.js";
import { jsonToolResult } from "./tool-result.js";

export function json(data: unknown) {
  return jsonToolResult(data);
}

export function createToolContext(api: OpenClawPluginApi, toolName: string, accountIndex = 0) {
  const logPrefix = `${toolName}:`;
  const log = {
    info: (message: string) => api.logger.info?.(`${logPrefix} ${message}`),
    warn: (message: string) => api.logger.warn?.(`${logPrefix} ${message}`),
    error: (message: string) => api.logger.error?.(`${logPrefix} ${message}`),
    debug: (message: string) => api.logger.debug?.(`${logPrefix} ${message}`),
  };

  return {
    toolClient: () => createUserToolClient(api.config, accountIndex),
    log,
  };
}

export function registerTool(
  api: OpenClawPluginApi,
  tool: Parameters<OpenClawPluginApi["registerTool"]>[0],
  opts?: Parameters<OpenClawPluginApi["registerTool"]>[1],
) {
  api.registerTool(tool, opts);
}

export function assertLarkOk(res: { code?: number; msg?: string }) {
  if (!res.code || res.code === 0) {
    return;
  }
  throw new Error(res.msg ?? `Feishu API error (code=${res.code})`);
}

export function StringEnum<T extends string>(values: readonly T[], options?: SchemaOptions): TSchema {
  return Type.Union(values.map((value) => Type.Literal(value)), options);
}

export function parseTimeToTimestamp(input: string): string | null {
  const date = parseDateLike(input);
  return date ? Math.floor(date.getTime() / 1000).toString() : null;
}

export function parseTimeToTimestampMs(input: string): string | null {
  const date = parseDateLike(input);
  return date ? date.getTime().toString() : null;
}

export function parseTimeToRFC3339(input: string): string | null {
  const trimmed = input.trim();
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toString() === "Invalid Date" ? null : trimmed;
  }
  const normalized = trimmed.replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const [, y, m, d, hh, mm, ss] = match;
  return `${y}-${m}-${d}T${hh}:${mm}:${ss ?? "00"}+08:00`;
}

export function unixTimestampToISO8601(raw: string | number | undefined): string | null {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }
  const ms = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(ms).toISOString();
}

function parseDateLike(input: string): Date | null {
  const trimmed = input.trim();
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalized = trimmed.replace("T", " ");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 8,
      Number(minute),
      Number(second ?? "0"),
    ),
  );
}

export async function handleInvokeError(error: unknown, _api: OpenClawPluginApi) {
  if (error instanceof AppScopeMissingError) {
    return json({
      error: "app_scope_missing",
      message: error.message,
      missing_scopes: error.missingScopes,
      app_id: error.appId,
      open_platform: openPlatformDomain("feishu"),
    });
  }

  if (error instanceof UserAuthRequiredError) {
    return json({
      error: "need_user_authorization",
      message: "当前用户尚未完成飞书 OAuth 授权，或授权范围不足。",
      required_scopes: error.requiredScopes,
      next_tool_call: {
        tool: "feishu_oauth",
        params: {
          action: "authorize",
          scope: error.requiredScopes.join(" "),
        },
      },
      default_scope_suggestion: getAllKnownScopes().join(" "),
    });
  }

  if (error instanceof UserScopeInsufficientError) {
    return json({
      error: "user_scope_insufficient",
      message: "当前用户授权范围不足，请重新授权补齐缺失 scope。",
      missing_scopes: error.missingScopes,
      next_tool_call: {
        tool: "feishu_oauth",
        params: {
          action: "authorize",
          scope: error.missingScopes.join(" "),
        },
      },
    });
  }

  return json({ error: formatLarkError(error) });
}
