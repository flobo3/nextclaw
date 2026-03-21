import { findProviderByName, type ProviderSpec } from "../providers/registry.js";
import { matchProvider, type Config, type ProviderConfig } from "./schema.js";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stripProviderPrefix(model: string, providerName?: string | null): string {
  const normalizedModel = model.trim();
  const normalizedProvider = providerName?.trim().toLowerCase();
  if (!normalizedModel || !normalizedProvider) {
    return normalizedModel;
  }
  const prefix = `${normalizedProvider}/`;
  if (!normalizedModel.toLowerCase().startsWith(prefix)) {
    return normalizedModel;
  }
  return normalizedModel.slice(prefix.length);
}

export type ProviderRuntimeResolution = {
  inputModel: string;
  resolvedModel: string;
  providerLocalModel: string;
  provider: ProviderConfig | null;
  providerName: string | null;
  providerDisplayName: string | null;
  providerSpec: ProviderSpec | null;
  apiKey: string | null;
  apiBase: string | null;
};

export function resolveProviderRuntime(config: Config, model?: string): ProviderRuntimeResolution {
  const resolvedModel = String(model ?? config.agents.defaults.model ?? "").trim();
  const { provider, name } = matchProvider(config, resolvedModel);
  const providerSpec = name ? findProviderByName(name) ?? null : null;
  const providerDisplayName =
    normalizeOptionalString(provider?.displayName) ??
    normalizeOptionalString(providerSpec?.displayName) ??
    normalizeOptionalString(name);
  const apiBase = normalizeOptionalString(provider?.apiBase) ?? providerSpec?.defaultApiBase ?? null;

  return {
    inputModel: String(model ?? "").trim(),
    resolvedModel,
    providerLocalModel: stripProviderPrefix(resolvedModel, name),
    provider,
    providerName: name,
    providerDisplayName,
    providerSpec,
    apiKey: normalizeOptionalString(provider?.apiKey),
    apiBase,
  };
}
