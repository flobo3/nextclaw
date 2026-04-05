import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig, saveConfig } from "./loader.js";
import { ConfigSchema } from "./schema.js";
import { createAgentProfile, resolveAgentAvatarHomePath, resolveEffectiveAgentProfiles } from "./agent-profiles.js";

const tempDirs: string[] = [];

function createTempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "nextclaw-agent-profiles-test-"));
  tempDirs.push(dir);
  return join(dir, "config.json");
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("agent profiles", () => {
  it("creates a new agent with default home and generated avatar", () => {
    const configPath = createTempConfigPath();
    const workspace = join(dirname(configPath), "workspace");
    saveConfig(
      ConfigSchema.parse({
        agents: {
          defaults: {
            workspace
          }
        }
      }),
      configPath
    );

    const created = createAgentProfile(
      {
        id: "engineer"
      },
      {
        configPath
      }
    );

    expect(created.id).toBe("engineer");
    expect(created.displayName).toBe("Engineer");
    expect(created.workspace).toBe(`${workspace}-engineer`);
    expect(created.avatar).toBe("home://avatar.svg");
    expect(existsSync(join(created.workspace, "avatar.svg"))).toBe(true);
    expect(readFileSync(join(created.workspace, "avatar.svg"), "utf-8")).toContain("<svg");

    const saved = loadConfig(configPath);
    expect(resolveEffectiveAgentProfiles(saved).map((agent) => agent.id)).toEqual(["main", "engineer"]);
  });

  it("rejects avatar refs that escape the agent home directory", () => {
    expect(() =>
      resolveAgentAvatarHomePath({
        homeDirectory: "/tmp/agent-home",
        avatarRef: "home://../../etc/passwd"
      })
    ).toThrow("avatar ref escapes agent home directory");
  });
});
