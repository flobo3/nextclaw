import type { MarketplaceRecommendationResult } from "../domain/model";
import type { MarketplaceRepository } from "../domain/repository";

export class ListMarketplaceRecommendationsUseCase {
  constructor(private readonly repository: MarketplaceRepository) {}

  async execute(sceneId: string | undefined, limit: number): Promise<MarketplaceRecommendationResult> {
    return this.repository.listRecommendations(sceneId, limit);
  }
}
