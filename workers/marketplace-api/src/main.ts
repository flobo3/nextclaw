import { GetMarketplaceItemUseCase } from "./application/get-item.usecase";
import { ListMarketplaceItemsUseCase } from "./application/list-items.usecase";
import { ListMarketplaceRecommendationsUseCase } from "./application/list-recommendations.usecase";
import { BundledMarketplaceDataSource } from "./infrastructure/bundled-data-source";
import { InMemoryMarketplaceRepository } from "./infrastructure/in-memory-marketplace-repository";
import { MarketplaceController } from "./presentation/http/marketplace-controller";
import { MarketplaceQueryParser } from "./presentation/http/query-parser";
import { ApiResponseFactory } from "./presentation/http/response";
import { MarketplaceRouter } from "./presentation/http/router";

class MarketplaceContainer {
  private readonly dataSource = new BundledMarketplaceDataSource();
  private readonly repository = new InMemoryMarketplaceRepository(this.dataSource, {
    cacheTtlMs: 120_000
  });
  private readonly listItems = new ListMarketplaceItemsUseCase(this.repository);
  private readonly getItem = new GetMarketplaceItemUseCase(this.repository);
  private readonly listRecommendations = new ListMarketplaceRecommendationsUseCase(this.repository);
  private readonly parser = new MarketplaceQueryParser();
  private readonly responses = new ApiResponseFactory();
  private readonly controller = new MarketplaceController(
    this.listItems,
    this.getItem,
    this.listRecommendations,
    this.parser,
    this.responses
  );
  private readonly router = new MarketplaceRouter(this.controller, this.responses);

  app() {
    return this.router.register();
  }
}

const container = new MarketplaceContainer();

export default container.app();
