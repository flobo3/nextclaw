import type { Context } from "hono";
import type { GetMarketplaceItemUseCase } from "../../application/get-item.usecase";
import type { ListMarketplaceItemsUseCase } from "../../application/list-items.usecase";
import type { ListMarketplaceRecommendationsUseCase } from "../../application/list-recommendations.usecase";
import type { MarketplaceQueryParser } from "./query-parser";
import type { ApiResponseFactory } from "./response";

export class MarketplaceController {
  constructor(
    private readonly listItemsUseCase: ListMarketplaceItemsUseCase,
    private readonly getItemUseCase: GetMarketplaceItemUseCase,
    private readonly listRecommendationsUseCase: ListMarketplaceRecommendationsUseCase,
    private readonly parser: MarketplaceQueryParser,
    private readonly responses: ApiResponseFactory
  ) {}

  async health(c: Context) {
    return this.responses.ok(c, {
      status: "ok",
      service: "marketplace-api"
    });
  }

  async listItems(c: Context) {
    const query = this.parser.parseListQuery(c);
    const data = await this.listItemsUseCase.execute(query);
    return this.responses.ok(c, data);
  }

  async getItem(c: Context) {
    const slug = c.req.param("slug");
    const type = this.parser.parseItemType(c);
    const data = await this.getItemUseCase.execute(slug, type);
    return this.responses.ok(c, data);
  }

  async listRecommendations(c: Context) {
    const sceneId = this.parser.parseRecommendationScene(c);
    const limit = this.parser.parseRecommendationLimit(c);
    const data = await this.listRecommendationsUseCase.execute(sceneId, limit);
    return this.responses.ok(c, data);
  }
}
