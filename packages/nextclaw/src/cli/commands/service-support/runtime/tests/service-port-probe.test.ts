import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as NextclawCoreModule from "@nextclaw/core";

const mocks = vi.hoisted(() => ({
  loadConfigMock: vi.fn(),
}));

vi.mock("@nextclaw/core", async (importOriginal) => {
  const actual = await importOriginal<typeof NextclawCoreModule>();
  return {
    ...actual,
    loadConfig: mocks.loadConfigMock,
  };
});

import { describeUnmanagedHealthyTargetMessage } from "../service-port-probe.js";

describe("service-port-probe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadConfigMock.mockReturnValue({
      ui: {
        enabled: true,
        host: "127.0.0.1",
        port: 55667,
        open: false,
      },
    });
  });

  it("describes a healthy unmanaged service already serving the target port", async () => {
    await expect(
      describeUnmanagedHealthyTargetMessage({
        uiOverrides: {
          enabled: true,
          host: "0.0.0.0",
          open: false,
        },
        checkPortAvailabilityFn: vi.fn().mockResolvedValue({
          available: false,
          detail: "bind failed on 0.0.0.0:55667",
        }),
        probeHealthEndpointFn: vi.fn().mockResolvedValue({
          healthy: true,
          error: null,
        }),
      }),
    ).resolves.toContain("restart only stops the background service recorded in managed state");
  });

  it("returns null when the target port is unavailable but not serving a healthy nextclaw instance", async () => {
    await expect(
      describeUnmanagedHealthyTargetMessage({
        uiOverrides: {
          enabled: true,
          host: "0.0.0.0",
          open: false,
        },
        checkPortAvailabilityFn: vi.fn().mockResolvedValue({
          available: false,
          detail: "bind failed on 0.0.0.0:55667",
        }),
        probeHealthEndpointFn: vi.fn().mockResolvedValue({
          healthy: false,
          error: "connection refused",
        }),
      }),
    ).resolves.toBeNull();
  });
});
