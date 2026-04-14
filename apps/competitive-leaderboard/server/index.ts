import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { serveStatic } from "hono/serve-static";
import { existsSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  ApiEnvelope,
  LeaderboardOverview,
  ProductDetail
} from "../shared/competitive-leaderboard.types.js";
import { CompetitiveLeaderboardDataService } from "./leaderboard-data.service.js";
import { CompetitiveLeaderboardScoringService } from "./leaderboard-scoring.service.js";

const host = process.env.COMPETITIVE_LEADERBOARD_HOST?.trim() || "127.0.0.1";
const port = parsePort(process.env.COMPETITIVE_LEADERBOARD_PORT, 3194);
const appRoot = process.cwd();
const staticDir = resolve(appRoot, "dist/client");
const dataService = new CompetitiveLeaderboardDataService();
const scoringService = new CompetitiveLeaderboardScoringService(dataService);
const app = new Hono();

function okEnvelope<T>(data: T): ApiEnvelope<T> {
  return {
    ok: true,
    data
  };
}

function errorEnvelope(code: string, message: string): ApiEnvelope<never> {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

app.use("/*", compress());
app.use("/api/*", cors());

app.get("/health", (c) => {
  return c.json(okEnvelope({
    status: "ok"
  }));
});

app.get("/api/leaderboard", (c) => {
  try {
    const overview: LeaderboardOverview = scoringService.createOverview();
    return c.json(okEnvelope(overview));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load leaderboard overview.";
    return c.json(errorEnvelope("OVERVIEW_FAILED", message), 500);
  }
});

app.get("/api/products/:productId", (c) => {
  try {
    const detail: ProductDetail = scoringService.getProductDetail(c.req.param("productId"));
    return c.json(okEnvelope(detail));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load product detail.";
    const status = message.startsWith("Unknown leaderboard product") ? 404 : 400;
    return c.json(errorEnvelope(status === 404 ? "PRODUCT_NOT_FOUND" : "PRODUCT_DETAIL_FAILED", message), status);
  }
});

if (existsSync(join(staticDir, "index.html"))) {
  const indexHtml = readFileSync(join(staticDir, "index.html"), "utf8");
  app.use(
    "/*",
    serveStatic({
      root: staticDir,
      join,
      getContent: async (filePath) => {
        try {
          return await readFile(filePath);
        } catch {
          return null;
        }
      },
      isDir: async (filePath) => {
        try {
          return (await stat(filePath)).isDirectory();
        } catch {
          return false;
        }
      }
    })
  );

  app.get("*", (c) => {
    if (c.req.path.startsWith("/api") || c.req.path.startsWith("/health")) {
      return c.notFound();
    }
    return c.html(indexHtml);
  });
}

serve(
  {
    fetch: app.fetch,
    hostname: host,
    port
  },
  (serverInfo) => {
    console.log(
      `[competitive-leaderboard] listening at http://${serverInfo.address}:${serverInfo.port}`
    );
  }
);

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
