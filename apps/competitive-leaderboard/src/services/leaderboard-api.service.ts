import type {
  ApiEnvelope,
  LeaderboardOverview,
  ProductDetail
} from "@shared/competitive-leaderboard.types";

class LeaderboardApiService {
  readonly baseUrl: string;

  constructor(baseUrl = (import.meta.env.VITE_COMPETITIVE_LEADERBOARD_API_BASE ?? "").replace(/\/+$/, "")) {
    this.baseUrl = baseUrl;
  }

  createLeaderboardUrl = (): string => {
    const path = "/api/leaderboard";
    return this.baseUrl ? `${this.baseUrl}${path}` : path;
  };

  createProductUrl = (productId: string): string => {
    const path = `/api/products/${productId}`;
    return this.baseUrl ? `${this.baseUrl}${path}` : path;
  };

  getOverview = async (): Promise<LeaderboardOverview> => {
    const response = await fetch(this.createLeaderboardUrl());
    const payload = (await response.json()) as ApiEnvelope<LeaderboardOverview>;

    if (!response.ok || !payload.ok) {
      const message = payload.ok ? "Failed to load leaderboard overview." : payload.error.message;
      throw new Error(message);
    }

    return payload.data;
  };

  getProductDetail = async (productId: string): Promise<ProductDetail> => {
    const response = await fetch(this.createProductUrl(productId));
    const payload = (await response.json()) as ApiEnvelope<ProductDetail>;

    if (!response.ok || !payload.ok) {
      const message = payload.ok ? "Failed to load leaderboard product detail." : payload.error.message;
      throw new Error(message);
    }

    return payload.data;
  };
}

export const leaderboardApiService = new LeaderboardApiService();
