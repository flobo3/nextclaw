import { Hono } from "hono";
import { DomainValidationError, ResourceNotFoundError } from "../../domain/errors";
import type { MarketplaceController } from "./marketplace-controller";
import type { ApiResponseFactory } from "./response";

export class MarketplaceRouter {
  private readonly app = new Hono();

  constructor(
    private readonly controller: MarketplaceController,
    private readonly responses: ApiResponseFactory
  ) {}

  register() {
    this.app.notFound((c) => this.responses.error(c, "NOT_FOUND", "endpoint not found", 404));

    this.app.onError((error, c) => {
      if (error instanceof ResourceNotFoundError) {
        return this.responses.error(c, "NOT_FOUND", error.message, 404);
      }

      if (error instanceof DomainValidationError) {
        return this.responses.error(c, "INVALID_QUERY", error.message, 400);
      }

      return this.responses.error(c, "INTERNAL_ERROR", error.message || "internal error", 500);
    });

    this.app.use("/api/v1/*", async (c, next) => {
      if (c.req.method !== "GET") {
        return this.responses.error(c, "READ_ONLY_API", "marketplace api is read-only", 405);
      }
      await next();
      return undefined;
    });

    this.app.get("/health", (c) => this.controller.health(c));
    this.app.get("/api/v1/items", (c) => this.controller.listItems(c));
    this.app.get("/api/v1/items/:slug", (c) => this.controller.getItem(c));
    this.app.get("/api/v1/recommendations", (c) => this.controller.listRecommendations(c));

    return this.app;
  }
}
