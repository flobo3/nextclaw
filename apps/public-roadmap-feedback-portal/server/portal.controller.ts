import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import type {
  ApiEnvelope,
  ItemsQuery,
  ItemsResponse,
  PortalOverview,
  PublicItemDetail,
  UpdatesResponse
} from "../shared/public-roadmap-feedback-portal.types.js";
import { PUBLIC_ITEM_TYPES as PORTAL_ITEM_TYPES, PUBLIC_PHASES } from "../shared/public-roadmap-feedback-portal.types.js";
import type { PortalWorkerEnv } from "./portal-env.types.js";
import { PortalRuntimeService } from "./portal-runtime.service.js";

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

export const publicRoadmapFeedbackPortalApp = new Hono<{
  Bindings: PortalWorkerEnv;
}>();

publicRoadmapFeedbackPortalApp.use("/api/*", cors());

publicRoadmapFeedbackPortalApp.get("/health", (c) => {
  return c.json(okEnvelope({
    status: "ok"
  }));
});

publicRoadmapFeedbackPortalApp.get("/api/overview", (c) => {
  return runJson(c, async () => {
    const overview: PortalOverview = await createRuntime(c.env).getOverview();
    return overview;
  }, "OVERVIEW_FAILED", "Failed to load portal overview.");
});

publicRoadmapFeedbackPortalApp.get("/api/items", (c) => {
  return runJson(c, async () => {
    const runtime = createRuntime(c.env);
    const query: ItemsQuery = {
      phase: isKnownPhase(`${c.req.query("phase") ?? ""}`) ? c.req.query("phase") as ItemsQuery["phase"] : "all",
      type: isKnownType(`${c.req.query("type") ?? ""}`) ? c.req.query("type") as ItemsQuery["type"] : "all",
      sort: c.req.query("sort") === "hot" ? "hot" : "recent",
      view: c.req.query("view") === "list" ? "list" : "board"
    };
    const items: ItemsResponse = await runtime.listItems(query);
    return items;
  }, "ITEMS_FAILED", "Failed to load roadmap items.");
});

publicRoadmapFeedbackPortalApp.get("/api/items/:itemId", (c) => {
  return runJson(c, async () => {
    const detail: PublicItemDetail = await createRuntime(c.env).getItemDetail(c.req.param("itemId"));
    return detail;
  }, "ITEM_DETAIL_FAILED", "Failed to load roadmap item.");
});

publicRoadmapFeedbackPortalApp.get("/api/updates", (c) => {
  return runJson(c, async () => {
    const updates: UpdatesResponse = await createRuntime(c.env).getUpdates();
    return updates;
  }, "UPDATES_FAILED", "Failed to load product updates.");
});

publicRoadmapFeedbackPortalApp.post("/internal/sync/linear", (c) => {
  return runJson(c, async () => {
    const runtime = createRuntime(c.env);
    runtime.assertInternalToken(c.req.header("authorization") ?? c.req.header("x-portal-internal-token") ?? null);
    return await runtime.syncLinearRoadmap();
  }, "SYNC_FAILED", "Failed to sync Linear roadmap.");
});

function createRuntime(env: PortalWorkerEnv): PortalRuntimeService {
  return new PortalRuntimeService(env);
}

function isKnownPhase(phase: string): boolean {
  return PUBLIC_PHASES.includes(phase as never);
}

function isKnownType(type: string): boolean {
  return PORTAL_ITEM_TYPES.includes(type as never);
}

async function runJson<T>(
  c: Context,
  action: () => Promise<T>,
  code: string,
  defaultMessage: string
): Promise<Response> {
  try {
    const data = await action();
    return c.json(okEnvelope(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : defaultMessage;
    const status = message.startsWith("Unknown public roadmap item") ? 404 : 500;
    return c.json(errorEnvelope(code === "ITEM_DETAIL_FAILED" && status === 404 ? "ITEM_NOT_FOUND" : code, message), status);
  }
}
