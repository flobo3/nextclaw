import { describe, expect, it, vi } from "vitest";
import { ExecTool } from "./shell.js";

describe("ExecTool", () => {
  it("passes windowsHide on Windows to avoid flashing cmd windows", async () => {
    const runner = vi.fn(async () => ({ stdout: "ok", stderr: "" }));
    const tool = new ExecTool({}, runner);
    const originalPlatform = process.platform;

    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "win32",
    });

    try {
      const result = await tool.execute({ command: "echo hello" });

      expect(result).toBe("ok");
      expect(runner).toHaveBeenCalledWith(
        "echo hello",
        expect.objectContaining({
          windowsHide: true,
        }),
      );
    } finally {
      Object.defineProperty(process, "platform", {
        configurable: true,
        value: originalPlatform,
      });
    }
  });
});
