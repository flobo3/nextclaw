import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DesktopBundleLifecycleService } from "../services/bundle-lifecycle.service";
import { DesktopBundleService } from "../services/bundle.service";
import { DesktopUpdateService } from "../services/update.service";
import { DesktopBundleManifestReader } from "../utils/bundle-manifest.utils";
import { DesktopUpdateManifestReader } from "../utils/update-manifest.utils";
import { compareDesktopVersions } from "../utils/version.utils";
import { DesktopBundleLayoutStore } from "../stores/bundle-layout.store";
import { DesktopLauncherStateStore } from "../stores/launcher-state.store";

type BundleFixtureOptions = {
  rootDir: string;
  version: string;
  platform?: string;
  arch?: string;
  includeUi?: boolean;
  includePlugins?: boolean;
};

async function withTempDir(prefix: string, run: (rootDir: string) => Promise<void> | void): Promise<void> {
  const rootDir = mkdtempSync(join(tmpdir(), prefix));
  try {
    await run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

function writeBundleFixture(options: BundleFixtureOptions): string {
  const {
    rootDir,
    version,
    platform = process.platform,
    arch = process.arch,
    includeUi = true,
    includePlugins = true
  } = options;
  const bundleDir = join(rootDir, version);
  mkdirSync(join(bundleDir, "runtime", "dist", "cli"), { recursive: true });
  writeFileSync(join(bundleDir, "runtime", "dist", "cli", "index.js"), "console.log('runtime');\n");

  if (includeUi) {
    mkdirSync(join(bundleDir, "ui"), { recursive: true });
    writeFileSync(join(bundleDir, "ui", "index.html"), "<html></html>\n");
  }

  if (includePlugins) {
    mkdirSync(join(bundleDir, "plugins"), { recursive: true });
    writeFileSync(join(bundleDir, "plugins", ".keep"), "\n");
  }

  writeFileSync(
    join(bundleDir, "manifest.json"),
    `${JSON.stringify(
      {
        bundleVersion: version,
        platform,
        arch,
        uiVersion: version,
        runtimeVersion: version,
        builtInPluginSetVersion: version,
        launcherCompatibility: {
          minVersion: "0.1.0"
        },
        entrypoints: {
          runtimeScript: "runtime/dist/cli/index.js"
        },
        migrationVersion: 1
      },
      null,
      2
    )}\n`
  );

  return bundleDir;
}

test("returns default launcher state when state file is missing", () =>
  withTempDir("nextclaw-desktop-state-", (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    const store = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    assert.deepEqual(store.read(), {
      channel: "stable",
      currentVersion: null,
      previousVersion: null,
      candidateVersion: null,
      candidateLaunchCount: 0,
      lastKnownGoodVersion: null,
      badVersions: [],
      lastUpdateCheckAt: null
    });
  }));

test("persists launcher state updates", async () =>
  await withTempDir("nextclaw-desktop-state-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    const store = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    await store.write({
      channel: "stable",
      currentVersion: "0.18.0",
      previousVersion: "0.17.9",
      candidateVersion: null,
      candidateLaunchCount: 0,
      lastKnownGoodVersion: "0.18.0",
      badVersions: ["0.17.8"],
      lastUpdateCheckAt: "2026-04-11T12:00:00Z"
    });
    assert.deepEqual(store.read(), {
      channel: "stable",
      currentVersion: "0.18.0",
      previousVersion: "0.17.9",
      candidateVersion: null,
      candidateLaunchCount: 0,
      lastKnownGoodVersion: "0.18.0",
      badVersions: ["0.17.8"],
      lastUpdateCheckAt: "2026-04-11T12:00:00Z"
    });
  }));

test("parses a valid desktop bundle manifest", () => {
  const reader = new DesktopBundleManifestReader();
  assert.deepEqual(
    reader.parse({
      bundleVersion: "0.18.0",
      platform: "darwin",
      arch: "arm64",
      uiVersion: "0.18.0",
      runtimeVersion: "0.18.0",
      builtInPluginSetVersion: "0.18.0",
      launcherCompatibility: {
        minVersion: "0.1.0"
      },
      entrypoints: {
        runtimeScript: "runtime/dist/cli/index.js"
      },
      migrationVersion: 1
    }),
    {
      bundleVersion: "0.18.0",
      platform: "darwin",
      arch: "arm64",
      uiVersion: "0.18.0",
      runtimeVersion: "0.18.0",
      builtInPluginSetVersion: "0.18.0",
      launcherCompatibility: {
        minVersion: "0.1.0"
      },
      entrypoints: {
        runtimeScript: "runtime/dist/cli/index.js"
      },
      migrationVersion: 1
    }
  );
});

test("parses a valid desktop update manifest", () => {
  const reader = new DesktopUpdateManifestReader();
  assert.deepEqual(
    reader.parse({
      channel: "stable",
      platform: "darwin",
      arch: "arm64",
      latestVersion: "0.18.1",
      minimumLauncherVersion: "0.1.0",
      bundleUrl: "https://example.com/nextclaw.bundle",
      bundleSha256: "abc123",
      releaseNotesUrl: "https://example.com/release-notes"
    }),
    {
      channel: "stable",
      platform: "darwin",
      arch: "arm64",
      latestVersion: "0.18.1",
      minimumLauncherVersion: "0.1.0",
      bundleUrl: "https://example.com/nextclaw.bundle",
      bundleSha256: "abc123",
      releaseNotesUrl: "https://example.com/release-notes"
    }
  );
});

test("compares desktop versions numerically", () => {
  assert.equal(compareDesktopVersions("0.18.1", "0.18.0"), 1);
  assert.equal(compareDesktopVersions("0.18.1", "0.18.1"), 0);
  assert.equal(compareDesktopVersions("0.18.0", "0.18.1"), -1);
});

test("rejects a manifest with a missing runtime entrypoint", () => {
  const reader = new DesktopBundleManifestReader();
  assert.throws(
    () => {
      reader.parse({
        bundleVersion: "0.18.0",
        platform: "darwin",
        arch: "arm64",
        uiVersion: "0.18.0",
        runtimeVersion: "0.18.0",
        builtInPluginSetVersion: "0.18.0",
        launcherCompatibility: {
          minVersion: "0.1.0"
        },
        entrypoints: {},
        migrationVersion: 1
      });
    },
    /runtimeScript/
  );
});

test("returns launcher-update-required when manifest needs a newer launcher", async () => {
  const updateClient = new DesktopUpdateService({
    layout: new DesktopBundleLayoutStore("/tmp/nextclaw-update-client"),
    launcherVersion: "0.1.0",
    platform: "darwin",
    arch: "arm64",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          channel: "stable",
          platform: "darwin",
          arch: "arm64",
          latestVersion: "0.18.1",
          minimumLauncherVersion: "0.2.0",
          bundleUrl: "https://example.com/nextclaw.bundle",
          bundleSha256: "abc123"
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
  });

  const result = await updateClient.checkForUpdate("https://example.com/manifest.json", "0.18.0");
  assert.deepEqual(result, {
    kind: "launcher-update-required",
    manifest: {
      channel: "stable",
      platform: "darwin",
      arch: "arm64",
      latestVersion: "0.18.1",
      minimumLauncherVersion: "0.2.0",
      bundleUrl: "https://example.com/nextclaw.bundle",
      bundleSha256: "abc123",
      releaseNotesUrl: null
    }
  });
});

test("downloads a bundle archive after verifying sha256", async () =>
  await withTempDir("nextclaw-update-download-", async (rootDir) => {
    const bytes = Buffer.from("bundle-archive");
    const sha256 = "28b25d7d2c26ab59d838b53fd534a32a3cb60f2b6dc7f7a92075ba06817dba82";
    const updateClient = new DesktopUpdateService({
      layout: new DesktopBundleLayoutStore(rootDir),
      launcherVersion: "0.1.0",
      fetchImpl: async (url) => {
        if (String(url).includes("manifest")) {
          return new Response(
            JSON.stringify({
              channel: "stable",
              platform: process.platform,
              arch: process.arch,
              latestVersion: "0.18.2",
              minimumLauncherVersion: "0.1.0",
              bundleUrl: "https://example.com/nextclaw.bundle",
              bundleSha256: sha256
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json"
              }
            }
          );
        }
        return new Response(bytes, { status: 200 });
      },
      now: () => 123
    });

    const availableUpdate = await updateClient.checkForUpdate("https://example.com/manifest.json", "0.18.1");
    assert.ok(availableUpdate);
    assert.equal(availableUpdate?.kind, "bundle-update");

    const downloadedBundle = await updateClient.downloadBundle(availableUpdate.manifest);
    assert.equal(downloadedBundle.archivePath, join(rootDir, "staging", "0.18.2-123.bundle"));
    assert.equal(downloadedBundle.sha256, sha256);
  }));

test("resolves the runtime script from the active bundle", async () =>
  await withTempDir("nextclaw-bundle-resolver-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    await layout.ensureLauncherDirs();
    const store = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    await store.write({
      channel: "stable",
      currentVersion: "0.18.0",
      previousVersion: null,
      candidateVersion: null,
      candidateLaunchCount: 0,
      lastKnownGoodVersion: "0.18.0",
      badVersions: [],
      lastUpdateCheckAt: null
    });
    const bundleDir = writeBundleFixture({
      rootDir: layout.getVersionsDir(),
      version: "0.18.0"
    });
    await layout.writeCurrentPointer({ version: "0.18.0" });

    const bundleManager = new DesktopBundleService({
      layout,
      stateStore: store
    });
    const resolved = bundleManager.resolveCurrentBundle();
    assert.ok(resolved);
    assert.equal(resolved?.manifest.bundleVersion, "0.18.0");
    assert.equal(resolved?.runtimeScriptPath, join(bundleDir, "runtime", "dist", "cli", "index.js"));
    assert.equal(resolved?.uiDirectory, join(bundleDir, "ui"));
    assert.equal(resolved?.pluginsDirectory, join(bundleDir, "plugins"));
  }));

test("rejects current bundle when pointer and state disagree", async () =>
  await withTempDir("nextclaw-bundle-resolver-mismatch-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    await layout.ensureLauncherDirs();
    const store = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    await store.write({
      channel: "stable",
      currentVersion: "0.18.0",
      previousVersion: null,
      candidateVersion: null,
      candidateLaunchCount: 0,
      lastKnownGoodVersion: null,
      badVersions: [],
      lastUpdateCheckAt: null
    });
    writeBundleFixture({
      rootDir: layout.getVersionsDir(),
      version: "0.18.1"
    });
    await layout.writeCurrentPointer({ version: "0.18.1" });

    const bundleManager = new DesktopBundleService({
      layout,
      stateStore: store
    });
    assert.throws(() => bundleManager.resolveCurrentBundle(), /does not match current pointer/);
  }));

test("installer copies a verified bundle into the version store", async () =>
  await withTempDir("nextclaw-bundle-installer-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    const sourceRoot = join(rootDir, "source");
    const sourceBundleDir = writeBundleFixture({
      rootDir: sourceRoot,
      version: "0.18.2"
    });

    const bundleManager = new DesktopBundleService({
      layout,
      launcherVersion: "0.1.0",
      now: () => 123
    });
    const installedBundle = await bundleManager.installFromDirectory(sourceBundleDir);

    assert.equal(installedBundle.bundleDirectory, layout.getVersionDir("0.18.2"));
    assert.equal(layout.readCurrentPointer(), null);
  }));

test("installer rejects a bundle that is missing the ui directory", async () =>
  await withTempDir("nextclaw-bundle-invalid-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    const sourceRoot = join(rootDir, "source");
    const sourceBundleDir = writeBundleFixture({
      rootDir: sourceRoot,
      version: "0.18.2",
      includeUi: false
    });

    const bundleManager = new DesktopBundleService({
      layout
    });

    await assert.rejects(async () => await bundleManager.installFromDirectory(sourceBundleDir), /ui directory missing/);
  }));

test("marks an activated bundle healthy after bootstrap succeeds", async () =>
  await withTempDir("nextclaw-bundle-healthy-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    await layout.ensureLauncherDirs();
    const store = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    const bundleDir = writeBundleFixture({
      rootDir: layout.getVersionsDir(),
      version: "0.18.3"
    });

    const lifecycle = new DesktopBundleLifecycleService({
      layout,
      stateStore: store
    });
    const result = await lifecycle.activateVersion("0.18.3");
    assert.equal(result.bundle.bundleDirectory, bundleDir);
    await lifecycle.markVersionHealthy("0.18.3");

    assert.deepEqual(store.read(), {
      channel: "stable",
      currentVersion: "0.18.3",
      previousVersion: null,
      candidateVersion: null,
      candidateLaunchCount: 0,
      lastKnownGoodVersion: "0.18.3",
      badVersions: [],
      lastUpdateCheckAt: null
    });
    assert.deepEqual(layout.readCurrentPointer(), { version: "0.18.3" });
    assert.equal(layout.readPreviousPointer(), null);
  }));

test("allows one startup attempt for a freshly activated candidate bundle", async () =>
  await withTempDir("nextclaw-bundle-candidate-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    await layout.ensureLauncherDirs();
    const store = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    writeBundleFixture({
      rootDir: layout.getVersionsDir(),
      version: "0.18.1"
    });

    await store.write({
      channel: "stable",
      currentVersion: "0.18.1",
      previousVersion: "0.18.0",
      candidateVersion: "0.18.1",
      candidateLaunchCount: 0,
      lastKnownGoodVersion: "0.18.0",
      badVersions: [],
      lastUpdateCheckAt: null
    });
    await layout.writeCurrentPointer({ version: "0.18.1" });

    const lifecycle = new DesktopBundleLifecycleService({
      layout,
      stateStore: store
    });
    const rollbackResult = await lifecycle.recoverPendingCandidate();

    assert.equal(rollbackResult, null);
    assert.equal(store.read().candidateLaunchCount, 1);
    assert.deepEqual(layout.readCurrentPointer(), { version: "0.18.1" });
  }));

test("rolls back an unconfirmed candidate to the last healthy bundle", async () =>
  await withTempDir("nextclaw-bundle-rollback-", async (rootDir) => {
    const layout = new DesktopBundleLayoutStore(rootDir);
    await layout.ensureLauncherDirs();
    const store = new DesktopLauncherStateStore(layout.getLauncherStatePath());
    writeBundleFixture({
      rootDir: layout.getVersionsDir(),
      version: "0.18.0"
    });
    writeBundleFixture({
      rootDir: layout.getVersionsDir(),
      version: "0.18.1"
    });

    await store.write({
      channel: "stable",
      currentVersion: "0.18.1",
      previousVersion: "0.18.0",
      candidateVersion: "0.18.1",
      candidateLaunchCount: 1,
      lastKnownGoodVersion: "0.18.0",
      badVersions: [],
      lastUpdateCheckAt: null
    });
    await layout.writeCurrentPointer({ version: "0.18.1" });
    await layout.writePreviousPointer({ version: "0.18.0" });

    const lifecycle = new DesktopBundleLifecycleService({
      layout,
      stateStore: store
    });
    const rollbackResult = await lifecycle.recoverPendingCandidate();

    assert.deepEqual(rollbackResult, {
      rolledBackFrom: "0.18.1",
      rolledBackTo: "0.18.0"
    });
    assert.deepEqual(store.read(), {
      channel: "stable",
      currentVersion: "0.18.0",
      previousVersion: null,
      candidateVersion: null,
      candidateLaunchCount: 0,
      lastKnownGoodVersion: "0.18.0",
      badVersions: ["0.18.1"],
      lastUpdateCheckAt: null
    });
    assert.deepEqual(layout.readCurrentPointer(), { version: "0.18.0" });
    assert.equal(layout.readPreviousPointer(), null);
  }));
