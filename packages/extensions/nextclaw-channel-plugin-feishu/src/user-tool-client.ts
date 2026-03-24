import * as Lark from "@larksuiteoapi/node-sdk";
import { listEnabledFeishuAccounts, resolveFeishuAccount } from "./accounts.js";
import { getAppGrantedScopes, invalidateAppScopeCache, missingScopes } from "./app-scope-checker.js";
import {
  AppScopeMissingError,
  LARK_ERROR,
  NeedAuthorizationError,
  UserAuthRequiredError,
  UserScopeInsufficientError,
} from "./auth-errors.js";
import { createFeishuClient } from "./client.js";
import { getTicket } from "./lark-ticket.js";
import { rawLarkRequest } from "./raw-request.js";
import { getRequiredScopes, type ToolActionKey } from "./tool-scopes.js";
import { callWithUAT } from "./uat-client.js";
import { getStoredToken } from "./token-store.js";
import type { ClawdbotConfig } from "./nextclaw-sdk/feishu.js";
import type { ResolvedFeishuAccount } from "./types.js";

type LarkRequestOptions = ReturnType<typeof Lark.withUserAccessToken>;
type InvokeFn<T> = (sdk: Lark.Client, opts?: LarkRequestOptions, uat?: string) => Promise<T>;

function assertConfiguredAccount(account: ResolvedFeishuAccount): ResolvedFeishuAccount & {
  appId: string;
  appSecret: string;
  configured: true;
} {
  if (!account.enabled) {
    throw new Error(`Feishu account "${account.accountId}" is disabled.`);
  }
  if (!account.configured || !account.appId || !account.appSecret) {
    throw new Error(`Feishu account "${account.accountId}" is not configured.`);
  }
  return account as ResolvedFeishuAccount & { appId: string; appSecret: string; configured: true };
}

function resolveConfiguredAccount(config: ClawdbotConfig, accountIndex = 0) {
  const ticket = getTicket();
  if (ticket?.accountId) {
    return assertConfiguredAccount(resolveFeishuAccount({ cfg: config, accountId: ticket.accountId }));
  }
  const accounts = listEnabledFeishuAccounts(config);
  if (accounts.length === 0) {
    throw new Error("No enabled Feishu accounts configured.");
  }
  return assertConfiguredAccount(accounts[Math.min(accountIndex, accounts.length - 1)]);
}

export class UserToolClient {
  readonly account: ReturnType<typeof assertConfiguredAccount>;
  readonly senderOpenId?: string;
  readonly sdk: Lark.Client;

  constructor(
    readonly config: ClawdbotConfig,
    accountIndex = 0,
  ) {
    this.account = resolveConfiguredAccount(config, accountIndex);
    this.senderOpenId = getTicket()?.senderOpenId;
    this.sdk = createFeishuClient(this.account);
  }

  async invoke<T>(
    toolAction: ToolActionKey,
    fn: InvokeFn<T>,
    options?: { as?: "user" | "tenant"; userOpenId?: string },
  ): Promise<T> {
    const requiredScopes = getRequiredScopes(toolAction);
    const tokenType = options?.as ?? "user";
    const appScopeVerified = await this.verifyAppScopes(requiredScopes, tokenType, toolAction);

    if (tokenType === "tenant") {
      try {
        return await fn(this.sdk);
      } catch (error) {
        this.rethrowStructuredError(error, toolAction, requiredScopes);
        throw error;
      }
    }

    const userOpenId = options?.userOpenId ?? this.senderOpenId;
    if (!userOpenId) {
      throw new UserAuthRequiredError("unknown", {
        apiName: toolAction,
        scopes: requiredScopes,
        appScopeVerified,
        appId: this.account.appId,
      });
    }

    const stored = await getStoredToken(this.account.appId, userOpenId);
    if (!stored) {
      throw new UserAuthRequiredError(userOpenId, {
        apiName: toolAction,
        scopes: requiredScopes,
        appScopeVerified,
        appId: this.account.appId,
      });
    }

    if (appScopeVerified && stored.scope && requiredScopes.length > 0) {
      const granted = new Set(stored.scope.split(/\s+/).filter(Boolean));
      const missingUserScopes = requiredScopes.filter((scope) => !granted.has(scope));
      if (missingUserScopes.length > 0) {
        throw new UserAuthRequiredError(userOpenId, {
          apiName: toolAction,
          scopes: missingUserScopes,
          appScopeVerified,
          appId: this.account.appId,
        });
      }
    }

    try {
      return await callWithUAT(
        {
          userOpenId,
          appId: this.account.appId,
          appSecret: this.account.appSecret,
          domain: this.account.domain,
        },
        (accessToken) => fn(this.sdk, Lark.withUserAccessToken(accessToken), accessToken),
      );
    } catch (error) {
      if (error instanceof NeedAuthorizationError) {
        throw new UserAuthRequiredError(userOpenId, {
          apiName: toolAction,
          scopes: requiredScopes,
          appScopeVerified,
          appId: this.account.appId,
        });
      }
      this.rethrowStructuredError(error, toolAction, requiredScopes, userOpenId);
      throw error;
    }
  }

  async invokeByPath<T = unknown>(
    toolAction: ToolActionKey,
    path: string,
    options?: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      query?: Record<string, string>;
      headers?: Record<string, string>;
      as?: "user" | "tenant";
      userOpenId?: string;
    },
  ): Promise<T> {
    return this.invoke(
      toolAction,
      async (_sdk, _opts, uat) =>
        rawLarkRequest<T>({
          domain: this.account.domain,
          path,
          method: options?.method,
          body: options?.body,
          query: options?.query,
          headers: options?.headers,
          accessToken: uat,
        }),
      options,
    );
  }

  private async verifyAppScopes(
    requiredScopes: string[],
    tokenType: "user" | "tenant",
    toolAction: ToolActionKey,
  ): Promise<boolean> {
    if (requiredScopes.length === 0) {
      return true;
    }
    const appGrantedScopes = await getAppGrantedScopes(this.sdk, this.account.appId, tokenType);
    if (appGrantedScopes.length === 0) {
      return false;
    }
    const missingAppScopes = missingScopes(
      appGrantedScopes,
      tokenType === "user"
        ? [...new Set([...requiredScopes, "offline_access"])]
        : requiredScopes,
    );
    if (missingAppScopes.length > 0) {
      throw new AppScopeMissingError({
        apiName: toolAction,
        scopes: missingAppScopes,
        appId: this.account.appId,
      });
    }
    return true;
  }

  private rethrowStructuredError(
    error: unknown,
    toolAction: ToolActionKey,
    requiredScopes: string[],
    userOpenId?: string,
  ): void {
    const code =
      (error as { code?: number; response?: { data?: { code?: number } } }).code ??
      (error as { response?: { data?: { code?: number } } }).response?.data?.code;

    if (code === LARK_ERROR.APP_SCOPE_MISSING) {
      invalidateAppScopeCache(this.account.appId);
      throw new AppScopeMissingError({
        apiName: toolAction,
        scopes: requiredScopes,
        appId: this.account.appId,
      });
    }

    if (code === LARK_ERROR.USER_SCOPE_INSUFFICIENT && userOpenId) {
      throw new UserScopeInsufficientError(userOpenId, {
        apiName: toolAction,
        scopes: requiredScopes,
      });
    }
  }
}

export function createUserToolClient(config: ClawdbotConfig, accountIndex = 0): UserToolClient {
  return new UserToolClient(config, accountIndex);
}
