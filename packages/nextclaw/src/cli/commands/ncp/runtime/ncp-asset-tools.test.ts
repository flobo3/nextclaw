import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { LocalAssetStore } from "@nextclaw/ncp-agent-runtime";
import { createAssetTools } from "./ncp-asset-tools.js";

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) {
      continue;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("createAssetTools", () => {
  it("publishes strict schema branches for asset_put", () => {
    const assetStore = new LocalAssetStore({
      rootDir: createTempDir("nextclaw-asset-tools-store-"),
    });
    const tool = createAssetTools({ assetStore }).find(
      (item) => item.name === "asset_put",
    );

    expect(tool?.parameters).toMatchObject({
      type: "object",
      oneOf: [
        expect.objectContaining({
          required: ["path"],
          additionalProperties: false,
        }),
        expect.objectContaining({
          required: ["bytesBase64", "fileName"],
          additionalProperties: false,
        }),
      ],
    });
  });

  it("stores a file from a validated path input", async () => {
    const assetRoot = createTempDir("nextclaw-asset-tools-store-");
    const sourceRoot = createTempDir("nextclaw-asset-tools-source-");
    const sourcePath = join(sourceRoot, "hello.txt");
    writeFileSync(sourcePath, "hello world");
    const assetStore = new LocalAssetStore({ rootDir: assetRoot });
    const tool = createAssetTools({ assetStore }).find(
      (item) => item.name === "asset_put",
    );

    const result = await tool?.execute({ path: sourcePath });

    expect(result).toMatchObject({
      ok: true,
      asset: expect.objectContaining({
        name: "hello.txt",
        mimeType: "application/octet-stream",
        sizeBytes: 11,
      }),
    });
  });
});
