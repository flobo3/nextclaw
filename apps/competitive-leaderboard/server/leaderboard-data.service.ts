import type {
  ChangeLogEntry,
  LeaderboardMethodology,
  ProductEvidence
} from "../shared/competitive-leaderboard.types.js";
import {
  CHANGE_LOG,
  DISCLOSURES,
  LEADERBOARD_GENERATED_AT,
  LEADERBOARD_METHODOLOGY_VERSION,
  METHODOLOGY
} from "./leaderboard-methodology.data.js";
import { PRODUCT_SEEDS, type ProductSeed } from "./leaderboard-products.data.js";

export class CompetitiveLeaderboardDataService {
  readonly evidenceByProductId = new Map<string, ProductEvidence[]>(
    PRODUCT_SEEDS.map((seed) => [seed.product.id, seed.evidence])
  );

  getGeneratedAt = (): string => LEADERBOARD_GENERATED_AT;

  getMethodologyVersion = (): string => LEADERBOARD_METHODOLOGY_VERSION;

  getProductSeeds = (): ProductSeed[] => PRODUCT_SEEDS;

  getEvidenceForProduct = (productId: string): ProductEvidence[] => this.evidenceByProductId.get(productId) ?? [];

  getMethodology = (): LeaderboardMethodology => METHODOLOGY;

  getDisclosures = (): string[] => DISCLOSURES;

  getChangeLog = (): ChangeLogEntry[] => CHANGE_LOG;
}
