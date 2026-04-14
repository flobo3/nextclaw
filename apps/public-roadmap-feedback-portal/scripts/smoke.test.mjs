#!/usr/bin/env node
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const appRoot = process.cwd();
const skipLocalServer = process.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_SKIP_LOCAL_SERVER === "1";
const baseUrl = (
  process.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_BASE_URL
  ?? (skipLocalServer ? "https://example.invalid" : "http://127.0.0.1:3196")
).replace(/\/+$/, "");
const distIndexPath = resolve(appRoot, "dist/client/index.html");
const serverPort = Number.parseInt(new URL(baseUrl).port || "3196", 10);

if (!skipLocalServer && !existsSync(distIndexPath)) {
  console.error("Smoke test requires a built client. Run `pnpm -C apps/public-roadmap-feedback-portal build` first.");
  process.exit(1);
}

let serverLogs = "";
const serverProcess = skipLocalServer
  ? null
  : spawn("pnpm", ["run", "start"], {
      cwd: appRoot,
      env: {
        ...process.env,
        PUBLIC_ROADMAP_FEEDBACK_PORTAL_PORT: `${serverPort}`
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

serverProcess?.stdout.on("data", (chunk) => {
  serverLogs += chunk.toString();
});
serverProcess?.stderr.on("data", (chunk) => {
  serverLogs += chunk.toString();
});

const stopServer = () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
};

process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);

try {
  await waitForHealth();

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1400
    }
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await expectText(page, "公开路线图与产品进展");
  await expectText(page, "Preview mode");
  await expectText(page, "社区建议与反馈");
  await expectText(page, "提交一个建议");

  const feedbackTitle = `Phase 3 smoke request ${Date.now()}`;
  const feedbackDescription = "希望事项详情页可以展示更多上下文和订阅入口，便于持续跟踪。";

  await page.getByLabel("标题").fill(feedbackTitle);
  await page.getByLabel("需求类型").selectOption("feature");
  await page.getByLabel("关联官方事项").selectOption("pulse-001");
  await page.getByLabel("称呼").first().fill("Smoke Tester");
  await page.getByLabel("详细描述").fill(feedbackDescription);
  await page.getByRole("button", { name: "提交公开建议" }).click();

  await expectText(page, feedbackTitle);

  const feedbackCard = page.locator(".feedback-thread-card").filter({ hasText: feedbackTitle }).first();
  await feedbackCard.getByRole("button", { name: "支持这个建议" }).click();
  await feedbackCard.getByLabel("称呼").fill("Smoke Commenter");
  await feedbackCard.getByLabel("评论").fill("这条建议值得优先做，特别适合公开路线图场景。");
  await feedbackCard.getByRole("button", { name: "回复这个建议" }).click();
  await expectText(page, "这条建议值得优先做");

  await page.getByRole("button", { name: "公开路线图与反馈门户" }).first().click();
  await expectText(page, "路线图事项详情");
  await expectText(page, feedbackTitle);

  await page.getByRole("button", { name: "支持这个事项" }).click();
  const detailPanel = page.locator(".detail-panel__card");
  await detailPanel.getByLabel("称呼").fill("Item Reviewer");
  await detailPanel.getByLabel("评论").fill("详情里直接看到社区声音很有帮助。");
  await detailPanel.getByRole("button", { name: "评论这个事项" }).click();
  await expectText(page, "详情里直接看到社区声音很有帮助");

  await browser.close();
  stopServer();
} catch (error) {
  stopServer();
  console.error(serverLogs.trim());
  throw error;
}

async function waitForHealth() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 400));
  }

  throw new Error(`Portal did not become healthy within 30 seconds at ${baseUrl}.`);
}

async function expectText(page, text) {
  await page.waitForFunction(
    (expectedText) => document.body.innerText.includes(expectedText),
    text,
    { timeout: 20_000 }
  );
}
