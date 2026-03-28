import assert from "node:assert/strict";
import { buildCodexCliEnv } from "./codex-cli-env.js";

const originalPath = process.env.PATH;
const originalHome = process.env.HOME;

process.env.PATH = "/usr/local/bin:/usr/bin:/bin";
process.env.HOME = "/Users/test";

try {
  const env = buildCodexCliEnv({
    sessionId: "session-test",
    apiKey: "sk-test",
    apiBase: "https://example.com/v1",
    env: {
      CUSTOM_FLAG: "enabled",
    },
  });

  assert.deepEqual(env, {
    ...process.env,
    PATH: "/usr/local/bin:/usr/bin:/bin",
    HOME: "/Users/test",
    CUSTOM_FLAG: "enabled",
    OPENAI_API_KEY: "sk-test",
    OPENAI_BASE_URL: "https://example.com/v1",
  });

  console.log("buildCodexCliEnv regression checks passed");
} finally {
  process.env.PATH = originalPath;
  process.env.HOME = originalHome;
}
