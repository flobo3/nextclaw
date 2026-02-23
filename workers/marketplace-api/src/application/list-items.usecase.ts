import type { MarketplaceListQuery, MarketplaceListResult } from "../domain/model";
import type { MarketplaceRepository } from "../domain/repository";

export class ListMarketplaceItemsUseCase {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(query: MarketplaceListQuery): Promise<MarketplaceListResult> {
    return this.repository.listItems(query);
  }
}
