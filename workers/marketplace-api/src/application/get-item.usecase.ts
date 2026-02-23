import { ResourceNotFoundError } from "../domain/errors";
import type { MarketplaceItem, MarketplaceItemType } from "../domain/model";
import type { MarketplaceRepository } from "../domain/repository";

export class GetMarketplaceItemUseCase {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(slug: string, type?: MarketplaceItemType): Promise<MarketplaceItem> {
    const item = await this.repository.getItemBySlug(slug, type);
    if (!item) {
      throw new ResourceNotFoundError(`marketplace item not found: ${slug}`);
    }
    return item;
  }
}
