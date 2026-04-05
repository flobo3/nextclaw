import {
  createAgentProfile,
  findEffectiveAgentProfile,
  loadConfig,
  readAgentAvatarContent,
  removeAgentProfile,
  resolveEffectiveAgentProfiles,
  type Config
} from "@nextclaw/core";
import type { AgentCreateRequest, AgentDeleteResult, AgentProfileView } from "./types.js";

export function listAgents(configPath: string): AgentProfileView[] {
  const config = loadConfig(configPath);
  return resolveEffectiveAgentProfiles(config).map((profile) => toAgentProfileView(config, profile.id));
}

export function createAgent(
  configPath: string,
  input: AgentCreateRequest,
  options: { initializeAgentHomeDirectory?: (homeDirectory: string) => void } = {}
): AgentProfileView {
  const created = createAgentProfile(
    {
      id: input.id,
      displayName: input.displayName,
      avatar: input.avatar,
      home: input.home
    },
    {
      configPath,
      initializeHomeDirectory: options.initializeAgentHomeDirectory
    }
  );
  const config = loadConfig(configPath);
  return toAgentProfileView(config, created.id);
}

export function deleteAgent(configPath: string, agentId: string): AgentDeleteResult | null {
  const deleted = removeAgentProfile(agentId, { configPath });
  if (!deleted) {
    return null;
  }
  return {
    deleted: true,
    agentId: agentId.trim().toLowerCase()
  };
}

export function readAgentAvatar(
  configPath: string,
  agentId: string
): { bytes: Uint8Array; mimeType: string } | null {
  const config = loadConfig(configPath);
  return readAgentAvatarContent({ config, agentId });
}

export function toAgentProfileView(config: Config, agentId: string): AgentProfileView {
  const profile = findEffectiveAgentProfile(config, agentId);
  if (!profile) {
    throw new Error(`unknown agent: ${agentId}`);
  }
  return {
    id: profile.id,
    default: profile.default,
    displayName: profile.displayName,
    avatar: profile.avatar,
    avatarUrl: buildAgentAvatarUrl(profile.id, profile.avatar),
    workspace: profile.workspace,
    model: profile.model,
    engine: profile.engine,
    engineConfig: profile.engineConfig,
    contextTokens: profile.contextTokens,
    maxToolIterations: profile.maxToolIterations,
    builtIn: profile.builtIn === true
  };
}

export function buildAgentAvatarUrl(agentId: string, avatar?: string): string | undefined {
  const normalized = typeof avatar === "string" ? avatar.trim() : "";
  if (!normalized) {
    return undefined;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  if (normalized.startsWith("home://")) {
    return `/api/agents/${encodeURIComponent(agentId)}/avatar`;
  }
  return undefined;
}
