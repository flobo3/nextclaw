import { feishuFetch } from "./feishu-fetch.js";
import type { FeishuDomain } from "./types.js";

export type DeviceAuthResponse = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
};

export type DeviceFlowTokenData = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  scope: string;
};

export type DeviceFlowResult =
  | { ok: true; token: DeviceFlowTokenData }
  | {
      ok: false;
      error: "authorization_pending" | "slow_down" | "access_denied" | "expired_token";
      message: string;
    };

export function resolveOAuthEndpoints(domain: FeishuDomain): {
  deviceAuthorization: string;
  token: string;
} {
  if (!domain || domain === "feishu") {
    return {
      deviceAuthorization: "https://accounts.feishu.cn/oauth/v1/device_authorization",
      token: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
    };
  }
  if (domain === "lark") {
    return {
      deviceAuthorization: "https://accounts.larksuite.com/oauth/v1/device_authorization",
      token: "https://open.larksuite.com/open-apis/authen/v2/oauth/token",
    };
  }

  const base = domain.replace(/\/+$/, "");
  let accountsBase = base;
  try {
    const parsed = new URL(base);
    if (parsed.hostname.startsWith("open.")) {
      accountsBase = `${parsed.protocol}//${parsed.hostname.replace(/^open\./, "accounts.")}`;
    }
  } catch {
    // ignore
  }

  return {
    deviceAuthorization: `${accountsBase}/oauth/v1/device_authorization`,
    token: `${base}/open-apis/authen/v2/oauth/token`,
  };
}

export async function requestDeviceAuthorization(params: {
  appId: string;
  appSecret: string;
  domain: FeishuDomain;
  scope?: string;
}): Promise<DeviceAuthResponse> {
  const endpoints = resolveOAuthEndpoints(params.domain);
  let scope = params.scope?.trim() ?? "";
  if (!scope.includes("offline_access")) {
    scope = scope ? `${scope} offline_access` : "offline_access";
  }

  const basicAuth = Buffer.from(`${params.appId}:${params.appSecret}`).toString("base64");
  const body = new URLSearchParams();
  body.set("client_id", params.appId);
  body.set("scope", scope);

  const response = await feishuFetch(endpoints.deviceAuthorization, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || data.error) {
    throw new Error(
      String(data.error_description ?? data.error ?? `HTTP ${response.status}`),
    );
  }

  return {
    deviceCode: String(data.device_code ?? ""),
    userCode: String(data.user_code ?? ""),
    verificationUri: String(data.verification_uri ?? ""),
    verificationUriComplete: String(data.verification_uri_complete ?? data.verification_uri ?? ""),
    expiresIn: Number(data.expires_in ?? 240),
    interval: Number(data.interval ?? 5),
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function pollDeviceToken(params: {
  appId: string;
  appSecret: string;
  domain: FeishuDomain;
  deviceCode: string;
  interval: number;
  expiresIn: number;
  signal?: AbortSignal;
}): Promise<DeviceFlowResult> {
  const endpoints = resolveOAuthEndpoints(params.domain);
  const deadline = Date.now() + params.expiresIn * 1000;
  let interval = params.interval;

  while (Date.now() < deadline) {
    if (params.signal?.aborted) {
      return { ok: false, error: "expired_token", message: "Polling was cancelled" };
    }

    await sleep(interval * 1000, params.signal);

    const response = await feishuFetch(endpoints.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: params.deviceCode,
        client_id: params.appId,
        client_secret: params.appSecret,
      }).toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;
    const error = typeof data.error === "string" ? data.error : undefined;

    if (!error && data.access_token) {
      return {
        ok: true,
        token: {
          accessToken: String(data.access_token),
          refreshToken: String(data.refresh_token ?? ""),
          expiresIn: Number(data.expires_in ?? 7200),
          refreshExpiresIn: Number(data.refresh_token_expires_in ?? data.expires_in ?? 7200),
          scope: String(data.scope ?? ""),
        },
      };
    }

    if (error === "authorization_pending") {
      continue;
    }
    if (error === "slow_down") {
      interval = Math.min(interval + 5, 60);
      continue;
    }
    if (error === "access_denied" || error === "expired_token") {
      return {
        ok: false,
        error,
        message: String(data.error_description ?? error),
      };
    }
  }

  return {
    ok: false,
    error: "expired_token",
    message: "Device authorization expired before approval finished.",
  };
}
