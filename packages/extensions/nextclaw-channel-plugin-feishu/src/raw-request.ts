import { feishuFetch } from "./feishu-fetch.js";
import { resolveDomainUrl } from "./domains.js";
import type { FeishuDomain } from "./types.js";

export async function rawLarkRequest<T>(options: {
  domain: FeishuDomain;
  path: string;
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  accessToken?: string;
}): Promise<T> {
  const url = new URL(options.path, resolveDomainUrl(options.domain));
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await feishuFetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = (await response.json()) as { code?: number; msg?: string };
  if (data.code !== undefined && data.code !== 0) {
    const error = new Error(data.msg ?? `Feishu API error: code=${data.code}`) as Error & {
      code?: number;
      msg?: string;
    };
    error.code = data.code;
    error.msg = data.msg;
    throw error;
  }
  return data as T;
}
