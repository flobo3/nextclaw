import { getConfigPath, loadConfig, saveConfig } from "@nextclaw/core";
import { createInterface } from "node:readline";
import { buildPlatformApiBaseErrorMessage, resolvePlatformApiBase } from "./remote-support/platform-api-base.js";
import {
  readBrowserAuthPollPayload,
  readBrowserAuthStartPayload,
  readLoginPayload,
  readPlatformAuthResultPayload,
  readPlatformErrorMessage,
  readPlatformUserPayload
} from "./platform-auth-support/payload.js";
import type { LoginCommandOptions } from "../types.js";
import { prompt } from "../utils.js";

type NextclawProviderConfig = {
  displayName?: string;
  apiKey?: string;
  apiBase?: string | null;
  extraHeaders?: Record<string, string> | null;
  wireApi?: "auto" | "chat" | "responses";
  models?: string[];
};

export type PlatformLoginResult = {
  token: string;
  role: string;
  email: string;
  platformBase: string;
  v1Base: string;
};

export type PlatformUserView = {
  id: string;
  email: string;
  username: string | null;
  role: string;
};

export type PlatformMeResult = {
  user: PlatformUserView;
  token: string;
  platformBase: string;
  v1Base: string;
};

export type PlatformBrowserAuthStartResult = {
  sessionId: string;
  verificationUri: string;
  expiresAt: string;
  intervalMs: number;
  platformBase: string;
  v1Base: string;
};

export type PlatformBrowserAuthPollResult =
  | {
    status: "pending";
    nextPollMs: number;
  }
  | {
    status: "authorized";
    token: string;
    role: string;
    email: string;
    platformBase: string;
    v1Base: string;
  }
  | {
    status: "expired";
    message: string;
  };

function resolveProviderConfig(opts: LoginCommandOptions): {
  configPath: string;
  config: ReturnType<typeof loadConfig>;
  providers: Record<string, NextclawProviderConfig>;
  nextclawProvider: NextclawProviderConfig;
  platformBase: string;
  v1Base: string;
  inputApiBase: string;
} {
  const configPath = getConfigPath();
  const config = loadConfig(configPath);
  const providers = config.providers as Record<string, NextclawProviderConfig>;
  const nextclawProvider = providers.nextclaw ?? {
    displayName: "",
    apiKey: "",
    apiBase: null,
    extraHeaders: null,
    wireApi: "auto",
    models: []
  };
  const configuredApiBase =
    typeof nextclawProvider.apiBase === "string" && nextclawProvider.apiBase.trim().length > 0
      ? nextclawProvider.apiBase.trim()
      : "https://ai-gateway-api.nextclaw.io/v1";
  const requestedApiBase =
    typeof opts.apiBase === "string" && opts.apiBase.trim().length > 0
      ? opts.apiBase.trim()
      : configuredApiBase;
  const { platformBase, v1Base, inputApiBase } = resolvePlatformApiBase({
    explicitApiBase: requestedApiBase,
    fallbackApiBase: "https://ai-gateway-api.nextclaw.io/v1"
  });
  return {
    configPath,
    config,
    providers,
    nextclawProvider,
    platformBase,
    v1Base,
    inputApiBase
  };
}

async function resolveCredentials(opts: LoginCommandOptions): Promise<{ email: string; password: string }> {
  let email = typeof opts.email === "string" ? opts.email.trim() : "";
  let password = typeof opts.password === "string" ? opts.password : "";
  if (email && password) {
    return { email, password };
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  try {
    if (!email) {
      email = (await prompt(rl, "Email: ")).trim();
    }
    if (!password) {
      password = await prompt(rl, "Password: ");
    }
  } finally {
    rl.close();
  }

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  return { email, password };
}

function persistPlatformToken(params: {
  configPath: string;
  config: ReturnType<typeof loadConfig>;
  providers: Record<string, NextclawProviderConfig>;
  nextclawProvider: NextclawProviderConfig;
  v1Base: string;
  token: string;
}): void {
  const { configPath, config, providers, nextclawProvider, v1Base, token } = params;
  nextclawProvider.apiBase = v1Base;
  nextclawProvider.apiKey = token;
  providers.nextclaw = nextclawProvider;
  saveConfig(config, configPath);
}

export class PlatformAuthCommands {
  private readStoredToken = (params: { apiBase?: string } = {}): {
    configPath: string;
    config: ReturnType<typeof loadConfig>;
    providers: Record<string, NextclawProviderConfig>;
    nextclawProvider: NextclawProviderConfig;
    platformBase: string;
    v1Base: string;
    inputApiBase: string;
    token: string;
  } => {
    const resolved = resolveProviderConfig({ apiBase: params.apiBase });
    const token = resolved.nextclawProvider.apiKey?.trim() ?? "";
    if (!token) {
      throw new Error("Not logged in. Run `nextclaw login` first.");
    }
    return {
      ...resolved,
      token
    };
  };

  loginResult = async (opts: LoginCommandOptions = {}): Promise<PlatformLoginResult> => {
    const { configPath, config, providers, nextclawProvider, platformBase, v1Base, inputApiBase } = resolveProviderConfig(opts);
    const { email, password } = await resolveCredentials(opts);
    const response = await fetch(`${platformBase}/platform/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const raw = await response.text();

    if (!response.ok) {
      throw new Error(buildPlatformApiBaseErrorMessage(inputApiBase, readPlatformErrorMessage(raw, response.status)));
    }

    const { token, role } = readLoginPayload(raw);
    persistPlatformToken({
      configPath,
      config,
      providers,
      nextclawProvider,
      v1Base,
      token
    });

    return {
      token,
      role,
      email,
      platformBase,
      v1Base
    };
  };

  startBrowserAuth = async (opts: Pick<LoginCommandOptions, "apiBase"> = {}): Promise<PlatformBrowserAuthStartResult> => {
    const { platformBase, v1Base, inputApiBase } = resolveProviderConfig(opts);
    const response = await fetch(`${platformBase}/platform/auth/browser/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(buildPlatformApiBaseErrorMessage(inputApiBase, readPlatformErrorMessage(raw, response.status)));
    }
    const result = readBrowserAuthStartPayload(raw);
    return {
      ...result,
      platformBase,
      v1Base
    };
  };

  pollBrowserAuth = async (params: {
    apiBase?: string;
    sessionId: string;
  }): Promise<PlatformBrowserAuthPollResult> => {
    const { configPath, config, providers, nextclawProvider, platformBase, v1Base, inputApiBase } = resolveProviderConfig({
      apiBase: params.apiBase
    });
    const response = await fetch(`${platformBase}/platform/auth/browser/poll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: params.sessionId
      })
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(buildPlatformApiBaseErrorMessage(inputApiBase, readPlatformErrorMessage(raw, response.status)));
    }
    const result = readBrowserAuthPollPayload(raw);
    if (result.status === "pending") {
      return {
        status: "pending",
        nextPollMs: result.nextPollMs ?? 1500
      };
    }
    if (result.status === "expired") {
      return {
        status: "expired",
        message: result.message ?? "Authorization session expired."
      };
    }

    persistPlatformToken({
      configPath,
      config,
      providers,
      nextclawProvider,
      v1Base,
      token: result.token ?? ""
    });
    return {
      status: "authorized",
      token: result.token ?? "",
      role: result.role ?? "user",
      email: result.email ?? "",
      platformBase,
      v1Base
    };
  };

  login = async (opts: LoginCommandOptions = {}): Promise<void> => {
    const result = await this.loginResult(opts);

    console.log(`✓ Logged in to NextClaw platform (${result.platformBase})`);
    console.log(`✓ Account: ${result.email} (${result.role})`);
    console.log(`✓ Token saved into providers.nextclaw.apiKey`);
  };

  me = async (params: { apiBase?: string } = {}): Promise<PlatformMeResult> => {
    const { platformBase, v1Base, inputApiBase, token } = this.readStoredToken(params);
    const response = await fetch(`${platformBase}/platform/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(buildPlatformApiBaseErrorMessage(inputApiBase, readPlatformErrorMessage(raw, response.status)));
    }
    return {
      user: readPlatformUserPayload(raw),
      token,
      platformBase,
      v1Base
    };
  };

  updateProfile = async (params: { username: string; apiBase?: string }): Promise<PlatformMeResult> => {
    const {
      configPath,
      config,
      providers,
      nextclawProvider,
      platformBase,
      v1Base,
      inputApiBase,
      token
    } = this.readStoredToken(params);
    const response = await fetch(`${platformBase}/platform/auth/profile`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: params.username
      })
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(buildPlatformApiBaseErrorMessage(inputApiBase, readPlatformErrorMessage(raw, response.status)));
    }
    const result = readPlatformAuthResultPayload(raw);
    persistPlatformToken({
      configPath,
      config,
      providers,
      nextclawProvider,
      v1Base,
      token: result.token
    });
    return {
      user: result.user,
      token: result.token,
      platformBase,
      v1Base
    };
  };

  logout = (): { cleared: boolean } => {
    const { configPath, config, providers, nextclawProvider } = resolveProviderConfig({});
    const cleared = Boolean(nextclawProvider.apiKey?.trim());
    nextclawProvider.apiKey = "";
    providers.nextclaw = nextclawProvider;
    saveConfig(config, configPath);
    return { cleared };
  };
}
