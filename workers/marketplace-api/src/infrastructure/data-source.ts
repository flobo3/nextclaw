import type { MarketplaceCatalogSnapshot } from "../domain/model";
import type { MarketplaceDataSource } from "../domain/repository";

export abstract class BaseMarketplaceDataSource implements MarketplaceDataSource {
  abstract loadSnapshot(): Promise<MarketplaceCatalogSnapshot>;
}
