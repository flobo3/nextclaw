const FEISHU_USER_AGENT = "nextclaw-feishu-plugin/0.2";

export function feishuFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", FEISHU_USER_AGENT);
  }
  return fetch(url, { ...init, headers });
}
