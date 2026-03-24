import { NeedAuthorizationError, REFRESH_TOKEN_RETRYABLE, TOKEN_RETRY_CODES } from "./auth-errors.js";
import { resolveOAuthEndpoints } from "./device-flow.js";
import { feishuFetch } from "./feishu-fetch.js";
import {
  getStoredToken,
  removeStoredToken,
  setStoredToken,
  tokenStatus,
  type StoredUAToken,
} from "./token-store.js";
import type { FeishuDomain } from "./types.js";

export type UATCallOptions = {
  userOpenId: string;
  appId: string;
  appSecret: string;
  domain: FeishuDomain;
};

const refreshLocks = new Map<string, Promise<StoredUAToken | null>>();

async function doRefreshToken(
  opts: UATCallOptions,
  stored: StoredUAToken,
): Promise<StoredUAToken | null> {
  if (Date.now() >= stored.refreshExpiresAt) {
    await removeStoredToken(opts.appId, opts.userOpenId);
    return null;
  }

  const endpoints = resolveOAuthEndpoints(opts.domain);
  const requestBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
    client_id: opts.appId,
    client_secret: opts.appSecret,
  }).toString();

  const callEndpoint = async () => {
    const response = await feishuFetch(endpoints.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: requestBody,
    });
    return (await response.json()) as Record<string, unknown>;
  };

  let data = await callEndpoint();
  const code = typeof data.code === "number" ? data.code : undefined;
  const error = typeof data.error === "string" ? data.error : undefined;

  if ((code !== undefined && code !== 0) || error) {
    if (code !== undefined && REFRESH_TOKEN_RETRYABLE.has(code)) {
      data = await callEndpoint();
      const retryCode = typeof data.code === "number" ? data.code : undefined;
      const retryError = typeof data.error === "string" ? data.error : undefined;
      if ((retryCode !== undefined && retryCode !== 0) || retryError) {
        await removeStoredToken(opts.appId, opts.userOpenId);
        return null;
      }
    } else {
      await removeStoredToken(opts.appId, opts.userOpenId);
      return null;
    }
  }

  if (!data.access_token) {
    throw new Error("Token refresh returned no access_token");
  }

  const now = Date.now();
  const updated: StoredUAToken = {
    userOpenId: stored.userOpenId,
    appId: opts.appId,
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? stored.refreshToken),
    expiresAt: now + Number(data.expires_in ?? 7200) * 1000,
    refreshExpiresAt: data.refresh_token_expires_in
      ? now + Number(data.refresh_token_expires_in) * 1000
      : stored.refreshExpiresAt,
    scope: String(data.scope ?? stored.scope),
    grantedAt: stored.grantedAt,
  };
  await setStoredToken(updated);
  return updated;
}

async function refreshWithLock(
  opts: UATCallOptions,
  stored: StoredUAToken,
): Promise<StoredUAToken | null> {
  const key = `${opts.appId}:${opts.userOpenId}`;
  const existing = refreshLocks.get(key);
  if (existing) {
    await existing;
    return getStoredToken(opts.appId, opts.userOpenId);
  }

  const promise = doRefreshToken(opts, stored);
  refreshLocks.set(key, promise);
  try {
    return await promise;
  } finally {
    refreshLocks.delete(key);
  }
}

export async function getValidAccessToken(opts: UATCallOptions): Promise<string> {
  const stored = await getStoredToken(opts.appId, opts.userOpenId);
  if (!stored) {
    throw new NeedAuthorizationError(opts.userOpenId);
  }

  const status = tokenStatus(stored);
  if (status === "valid") {
    return stored.accessToken;
  }
  if (status === "needs_refresh") {
    const refreshed = await refreshWithLock(opts, stored);
    if (!refreshed) {
      throw new NeedAuthorizationError(opts.userOpenId);
    }
    return refreshed.accessToken;
  }

  await removeStoredToken(opts.appId, opts.userOpenId);
  throw new NeedAuthorizationError(opts.userOpenId);
}

export async function callWithUAT<T>(
  opts: UATCallOptions,
  apiCall: (accessToken: string) => Promise<T>,
): Promise<T> {
  const accessToken = await getValidAccessToken(opts);
  try {
    return await apiCall(accessToken);
  } catch (error) {
    const code =
      (error as { code?: number; response?: { data?: { code?: number } } }).code ??
      (error as { response?: { data?: { code?: number } } }).response?.data?.code;
    if (!TOKEN_RETRY_CODES.has(Number(code))) {
      throw error;
    }

    const stored = await getStoredToken(opts.appId, opts.userOpenId);
    if (!stored) {
      throw new NeedAuthorizationError(opts.userOpenId);
    }
    const refreshed = await refreshWithLock(opts, stored);
    if (!refreshed) {
      throw new NeedAuthorizationError(opts.userOpenId);
    }
    return apiCall(refreshed.accessToken);
  }
}

export async function revokeUAT(appId: string, userOpenId: string): Promise<void> {
  await removeStoredToken(appId, userOpenId);
}
