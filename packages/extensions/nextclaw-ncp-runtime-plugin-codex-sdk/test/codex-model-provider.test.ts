import assert from "node:assert/strict";
import { resolveExternalModelProvider } from "../src/codex-model-provider.js";

assert.equal(
  resolveExternalModelProvider({
    explicitModelProvider: "nextclaw-codex-bridge-custom-2",
    providerName: "custom-2",
    providerDisplayName: "ai02",
    pluginId: "plugin-id",
  }),
  "nextclaw-codex-bridge-custom-2",
);

assert.equal(
  resolveExternalModelProvider({
    providerName: "custom-2",
    providerDisplayName: "ai02",
    pluginId: "plugin-id",
  }),
  "custom-2",
);

assert.equal(
  resolveExternalModelProvider({
    providerDisplayName: "ai02",
    pluginId: "plugin-id",
  }),
  "ai02",
);

console.log("resolveExternalModelProvider regression checks passed");
