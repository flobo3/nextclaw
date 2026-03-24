type ToolLike = {
  name: string;
  description?: string;
  run?: (...args: unknown[]) => Promise<unknown>;
};

function notAvailable(functionName: string): never {
  throw new Error(
    `@mariozechner/pi-coding-agent shim: ${functionName} is not available inside the NextClaw plugin loader runtime`
  );
}

function createStubTool(name: string): ToolLike {
  return {
    name,
    async run() {
      notAvailable(`${name}.run`);
    }
  };
}

export const CURRENT_SESSION_VERSION = "nextclaw-plugin-loader-shim";

export class DefaultResourceLoader {}

export class SessionManager {
  static open(): SessionManager {
    return new SessionManager();
  }

  appendMessage(): this {
    return this;
  }

  close(): void {}
}

export class SettingsManager {
  static create(): SettingsManager {
    return new SettingsManager();
  }

  static inMemory(): SettingsManager {
    return new SettingsManager();
  }

  getGlobalSettings(): Record<string, unknown> {
    return {};
  }

  getProjectSettings(): Record<string, unknown> {
    return {};
  }
}

export const readTool = createStubTool("read");
export const codingTools: ToolLike[] = [readTool];

export async function createAgentSession(): Promise<never> {
  notAvailable("createAgentSession");
}

export function createEditTool(): ToolLike {
  return createStubTool("edit");
}

export function createReadTool(): ToolLike {
  return createStubTool("read");
}

export function createWriteTool(): ToolLike {
  return createStubTool("write");
}

export function estimateTokens(value: unknown): number {
  if (typeof value === "string") {
    return Math.max(1, Math.ceil(value.length / 4));
  }
  try {
    const serialized = JSON.stringify(value);
    return serialized ? Math.max(1, Math.ceil(serialized.length / 4)) : 0;
  } catch {
    return 0;
  }
}

export function formatSkillsForPrompt(): string {
  return "";
}

export async function generateSummary(): Promise<string> {
  return "";
}

export function loadSkillsFromDir(): [] {
  return [];
}
