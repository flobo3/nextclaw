#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { RuntimeServiceProcess } = require("../dist/runtime-service.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const workspace = mkdtempSync(join(tmpdir(), "nextclaw-desktop-smoke-"));
const embeddedScriptPath = join(workspace, "mock-embedded-runtime.cjs");
const managedScriptPath = join(workspace, "mock-managed-runtime.cjs");

writeFileSync(
  embeddedScriptPath,
  [
    "const http = require('node:http');",
    "const args = process.argv.slice(2);",
    "const command = args[0];",
    "if (command === 'init') {",
    "  process.exit(0);",
    "}",
    "if (command !== 'serve') throw new Error('expected serve command');",
    "const portIndex = args.indexOf('--ui-port');",
    "const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 0;",
    "if (!port) throw new Error('missing --ui-port');",
    "const server = http.createServer((req, res) => {",
    "  if (req.url === '/api/health') {",
    "    res.writeHead(200, { 'content-type': 'application/json' });",
    "    res.end(JSON.stringify({ ok: true, data: { status: 'ok' } }));",
    "    return;",
    "  }",
    "  res.writeHead(404, { 'content-type': 'application/json' });",
    "  res.end(JSON.stringify({ ok: false }));",
    "});",
    "server.listen(port, '127.0.0.1');",
    "const shutdown = () => server.close(() => process.exit(0));",
    "process.on('SIGTERM', shutdown);",
    "process.on('SIGINT', shutdown);"
  ].join("\n"),
  "utf8"
);

writeFileSync(
  managedScriptPath,
  [
    "const { mkdirSync, writeFileSync } = require('node:fs');",
    "const { join, resolve } = require('node:path');",
    "const args = process.argv.slice(2);",
    "const command = args[0];",
    "const dataDir = resolve(process.env.NEXTCLAW_HOME || '.');",
    "const runDir = join(dataDir, 'run');",
    "const statePath = join(runDir, 'service.json');",
    "mkdirSync(runDir, { recursive: true });",
    "if (command === 'init') {",
    "  process.exit(0);",
    "}",
    "if (command !== 'start') throw new Error('expected start command');",
    "const port = Number(process.env.MANAGED_TEST_PORT || 0);",
    "if (!port) throw new Error('missing managed test port');",
    "writeFileSync(statePath, JSON.stringify({ uiHost: '0.0.0.0', uiPort: port }, null, 2));",
    "process.exit(0);"
  ].join("\n"),
  "utf8"
);

const logs = [];
const logger = {
  info: (message) => logs.push(message),
  warn: (message) => logs.push(message),
  error: (message) => logs.push(message)
};

const runtime = new RuntimeServiceProcess({
  logger,
  scriptPath: embeddedScriptPath,
  startupTimeoutMs: 8_000
});

try {
  const { baseUrl } = await runtime.start();
  const response = await fetch(`${baseUrl}/api/health`);
  assert(response.ok, "health endpoint must be available");
  const payload = await response.json();
  assert(payload?.ok === true, "health payload must include ok=true");

  const managedHome = join(workspace, "managed-home");
  const managedPort = await pickFreePort();
  const previousHome = process.env.NEXTCLAW_HOME;
  const previousManagedPort = process.env.MANAGED_TEST_PORT;
  mkdirSync(managedHome, { recursive: true });
  process.env.NEXTCLAW_HOME = managedHome;
  process.env.MANAGED_TEST_PORT = String(managedPort);

  try {
    const managedRuntime = new RuntimeServiceProcess({
      logger,
      scriptPath: managedScriptPath,
      mode: "managed-service",
      startupTimeoutMs: 8_000
    });
    const managedResult = await managedRuntime.start();
    assert(existsSync(join(managedHome, "run", "service.json")), "managed-service must write service.json");
    assert(
      managedResult.baseUrl === `http://127.0.0.1:${managedPort}`,
      `managed-service must resolve loopback UI url, got ${managedResult.baseUrl}`
    );
    assert(managedResult.port === managedPort, "managed-service must preserve service port");
  } finally {
    if (previousHome === undefined) {
      delete process.env.NEXTCLAW_HOME;
    } else {
      process.env.NEXTCLAW_HOME = previousHome;
    }
    if (previousManagedPort === undefined) {
      delete process.env.MANAGED_TEST_PORT;
    } else {
      process.env.MANAGED_TEST_PORT = previousManagedPort;
    }
  }

  await runtime.stop();
  console.log("desktop runtime smoke passed");
} finally {
  await runtime.stop();
  rmSync(workspace, { recursive: true, force: true });
}

async function pickFreePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to allocate free port.")));
        return;
      }
      const port = address.port;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}
