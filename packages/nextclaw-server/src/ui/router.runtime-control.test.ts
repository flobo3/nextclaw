import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigSchema, saveConfig } from "@nextclaw/core";
import type { UiRuntimeControlHost } from "./ui-routes/types.js";
import { createUiRouter } from "./router.js";

const tempDirs: string[] = [];

function createTempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "nextclaw-ui-runtime-control-test-"));
  tempDirs.push(dir);
  return join(dir, "config.json");
}

function createRuntimeControlHost(): UiRuntimeControlHost {
  return {
    getControl: vi.fn(() => ({
      environment: "managed-local-service" as const,
      lifecycle: "healthy" as const,
      message: "runtime healthy",
      canRestartService: {
        available: true,
        requiresConfirmation: false,
        impact: "brief-ui-disconnect" as const
      },
      canRestartApp: {
        available: false,
        requiresConfirmation: true,
        impact: "full-app-relaunch" as const,
        reasonIfUnavailable: "desktop only"
      }
    })),
    restartService: vi.fn(async () => ({
      accepted: true,
      action: "restart-service" as const,
      lifecycle: "restarting-service" as const,
      message: "Restart scheduled. This page may disconnect for a few seconds."
    }))
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  vi.restoreAllMocks();
});

describe("runtime control routes", () => {
  it("returns runtime control capabilities", async () => {
    const configPath = createTempConfigPath();
    saveConfig(ConfigSchema.parse({}), configPath);
    const runtimeControl = createRuntimeControlHost();
    const app = createUiRouter({
      configPath,
      publish: () => {},
      runtimeControl
    });

    const response = await app.request("http://localhost/api/runtime/control");
    expect(response.status).toBe(200);
    const payload = await response.json() as {
      ok: boolean;
      data: {
        lifecycle: string;
        canRestartService: {
          available: boolean;
        };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.lifecycle).toBe("healthy");
    expect(payload.data.canRestartService.available).toBe(true);
    expect(runtimeControl.getControl).toHaveBeenCalledOnce();
  });

  it("accepts service restart requests", async () => {
    const configPath = createTempConfigPath();
    saveConfig(ConfigSchema.parse({}), configPath);
    const runtimeControl = createRuntimeControlHost();
    const app = createUiRouter({
      configPath,
      publish: () => {},
      runtimeControl
    });

    const response = await app.request("http://localhost/api/runtime/control/restart-service", {
      method: "POST"
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as {
      ok: boolean;
      data: {
        accepted: boolean;
        action: string;
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.accepted).toBe(true);
    expect(payload.data.action).toBe("restart-service");
    expect(runtimeControl.restartService).toHaveBeenCalledOnce();
  });
});
