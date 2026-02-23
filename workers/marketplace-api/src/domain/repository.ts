import type {
  MarketplaceCatalogSnapshot,
  MarketplaceItem,
  MarketplaceItemType,
  MarketplaceListQuery,
  MarketplaceListResult,
  MarketplaceRecommendationResult
} from "./model";

export type MarketplaceDataSource = {
  loadSnapshot(): Promise<MarketplaceCatalogSnapshot>;
};

export interface MarketplaceRepository {
  listItems(query: MarketplaceListQuery): Promise<MarketplaceListResult>;
  getItemBySlug(slug: string, type?: MarketplaceItemType): Promise<MarketplaceItem | null>;
  listRecommendations(sceneId: string | undefined, limit: number): Promise<MarketplaceRecommendationResult>;
}
