import type { FeishuDomain } from "./types.js";

export function openPlatformDomain(domain?: FeishuDomain): string {
  return domain === "lark" ? "https://open.larksuite.com" : "https://open.feishu.cn";
}

export function wwwDomain(domain?: FeishuDomain): string {
  return domain === "lark" ? "https://www.larksuite.com" : "https://www.feishu.cn";
}

export function resolveDomainUrl(domain: FeishuDomain): string {
  if (domain === "feishu") {
    return "https://open.feishu.cn";
  }
  if (domain === "lark") {
    return "https://open.larksuite.com";
  }
  return domain.replace(/\/+$/, "");
}
