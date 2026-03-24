import type * as Lark from "@larksuiteoapi/node-sdk";
import { AppScopeCheckFailedError } from "./auth-errors.js";

type CacheEntry = {
  rawScopes: Array<{ scope: string; token_types?: string[] }>;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000;

export function invalidateAppScopeCache(appId: string): void {
  cache.delete(appId);
}

export async function getAppGrantedScopes(
  sdk: Lark.Client,
  appId: string,
  tokenType?: "user" | "tenant",
): Promise<string[]> {
  const cached = cache.get(appId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rawScopes
      .filter((scope) => !tokenType || !scope.token_types || scope.token_types.includes(tokenType))
      .map((scope) => scope.scope);
  }

  try {
    const response = await (sdk as unknown as {
      request: (params: {
        method: string;
        url: string;
        params: Record<string, string>;
      }) => Promise<{ code?: number; data?: { app?: { scopes?: Array<{ scope?: string; token_types?: string[] }> } } }>;
    }).request({
      method: "GET",
      url: `/open-apis/application/v6/applications/${appId}`,
      params: { lang: "zh_cn" },
    });

    if (response.code !== 0) {
      throw new AppScopeCheckFailedError(appId);
    }

    const rawScopes =
      response.data?.app?.scopes
        ?.filter((scope): scope is { scope: string; token_types?: string[] } =>
          typeof scope.scope === "string" && scope.scope.length > 0,
        ) ?? [];
    cache.set(appId, { rawScopes, fetchedAt: Date.now() });

    return rawScopes
      .filter((scope) => !tokenType || !scope.token_types || scope.token_types.includes(tokenType))
      .map((scope) => scope.scope);
  } catch (error) {
    if (error instanceof AppScopeCheckFailedError) {
      throw error;
    }

    const statusCode =
      (error as { response?: { status?: number }; status?: number; statusCode?: number }).response
        ?.status ??
      (error as { status?: number }).status ??
      (error as { statusCode?: number }).statusCode;
    if (statusCode === 400 || statusCode === 403) {
      throw new AppScopeCheckFailedError(appId);
    }
    return [];
  }
}

export function missingScopes(appGranted: string[], apiRequired: string[]): string[] {
  const granted = new Set(appGranted);
  return apiRequired.filter((scope) => !granted.has(scope));
}
