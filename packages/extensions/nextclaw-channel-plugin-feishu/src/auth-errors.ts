export const LARK_ERROR = {
  APP_SCOPE_MISSING: 99991672,
  USER_SCOPE_INSUFFICIENT: 99991679,
  TOKEN_INVALID: 99991668,
  TOKEN_EXPIRED: 99991677,
  REFRESH_TOKEN_INVALID: 20026,
  REFRESH_TOKEN_EXPIRED: 20037,
  REFRESH_TOKEN_REVOKED: 20064,
  REFRESH_TOKEN_ALREADY_USED: 20073,
  REFRESH_SERVER_ERROR: 20050,
} as const;

export const REFRESH_TOKEN_RETRYABLE = new Set<number>([LARK_ERROR.REFRESH_SERVER_ERROR]);
export const TOKEN_RETRY_CODES = new Set<number>([
  LARK_ERROR.TOKEN_INVALID,
  LARK_ERROR.TOKEN_EXPIRED,
]);

export type ScopeErrorInfo = {
  apiName: string;
  scopes: string[];
  appScopeVerified?: boolean;
  appId?: string;
};

export class NeedAuthorizationError extends Error {
  readonly userOpenId: string;

  constructor(userOpenId: string) {
    super("need_user_authorization");
    this.name = "NeedAuthorizationError";
    this.userOpenId = userOpenId;
  }
}

export class AppScopeCheckFailedError extends Error {
  readonly appId?: string;

  constructor(appId?: string) {
    super("应用缺少 application:application:self_manage 权限，无法查询应用权限配置。");
    this.name = "AppScopeCheckFailedError";
    this.appId = appId;
  }
}

export class AppScopeMissingError extends Error {
  readonly apiName: string;
  readonly missingScopes: string[];
  readonly appId?: string;

  constructor(info: ScopeErrorInfo) {
    super(`应用缺少权限 [${info.scopes.join(", ")}]，请管理员在飞书开放平台开通。`);
    this.name = "AppScopeMissingError";
    this.apiName = info.apiName;
    this.missingScopes = info.scopes;
    this.appId = info.appId;
  }
}

export class UserAuthRequiredError extends Error {
  readonly userOpenId: string;
  readonly apiName: string;
  readonly requiredScopes: string[];
  readonly appScopeVerified: boolean;
  readonly appId?: string;

  constructor(userOpenId: string, info: ScopeErrorInfo) {
    super("need_user_authorization");
    this.name = "UserAuthRequiredError";
    this.userOpenId = userOpenId;
    this.apiName = info.apiName;
    this.requiredScopes = info.scopes;
    this.appScopeVerified = info.appScopeVerified ?? true;
    this.appId = info.appId;
  }
}

export class UserScopeInsufficientError extends Error {
  readonly userOpenId: string;
  readonly apiName: string;
  readonly missingScopes: string[];

  constructor(userOpenId: string, info: ScopeErrorInfo) {
    super("user_scope_insufficient");
    this.name = "UserScopeInsufficientError";
    this.userOpenId = userOpenId;
    this.apiName = info.apiName;
    this.missingScopes = info.scopes;
  }
}
