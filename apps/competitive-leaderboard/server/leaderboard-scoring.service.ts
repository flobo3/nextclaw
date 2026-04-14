import type {
  CapabilityAssessment,
  CapabilityStatus,
  LeaderboardOverview,
  ProductComparability,
  ProductDetail,
  PublicMetric,
  RepoStats,
  SpotlightBoard,
  SpotlightBoardItem
} from "../shared/competitive-leaderboard.types.js";
import { CompetitiveLeaderboardDataService } from "./leaderboard-data.service.js";
import type { CapabilityAssessmentSeed, ProductSeed } from "./leaderboard-products.data.js";

type ProductScoreResult = {
  detail: ProductDetail;
  publicSignalScore: number;
  capabilityScore: number;
};

const COMPARABILITY_LABELS: Record<ProductComparability, string> = {
  core: "Core Comparable",
  adjacent: "Adjacent Alternative",
  watch: "Market Watch"
};

const CAPABILITY_MAX_POINTS = 6;

export class CompetitiveLeaderboardScoringService {
  readonly dataService: CompetitiveLeaderboardDataService;

  constructor(dataService = new CompetitiveLeaderboardDataService()) {
    this.dataService = dataService;
  }

  createOverview = (): LeaderboardOverview => {
    const productDetails = this.createSortedProductDetails();
    const ranking = productDetails.filter((detail) => detail.product.comparability === "core");

    return {
      generatedAt: this.dataService.getGeneratedAt(),
      methodologyVersion: this.dataService.getMethodologyVersion(),
      summary: {
        totalProducts: productDetails.length,
        coreComparableCount: productDetails.filter((detail) => detail.product.comparability === "core").length,
        adjacentCount: productDetails.filter((detail) => detail.product.comparability === "adjacent").length,
        watchCount: productDetails.filter((detail) => detail.product.comparability === "watch").length,
        rankedCount: ranking.length,
        evidenceCount: productDetails.reduce((total, detail) => total + detail.evidence.length, 0)
      },
      disclosures: this.dataService.getDisclosures(),
      productDetails,
      ranking,
      spotlightBoards: this.createSpotlightBoards(productDetails),
      methodology: this.dataService.getMethodology(),
      changeLog: this.dataService.getChangeLog()
    };
  };

  getProductDetail = (productId: string): ProductDetail => {
    const detail = this.createSortedProductDetails().find((item) => item.product.id === productId);
    if (!detail) {
      throw new Error(`Unknown leaderboard product: ${productId}`);
    }
    return detail;
  };

  createSortedProductDetails = (): ProductDetail[] => {
    const scoredProducts = this.dataService.getProductSeeds().map((seed) => this.createScoredDetail(seed));
    const coreResults = scoredProducts
      .filter((result) => result.detail.product.comparability === "core")
      .sort((left, right) => {
        if ((right.detail.overallScore ?? 0) !== (left.detail.overallScore ?? 0)) {
          return (right.detail.overallScore ?? 0) - (left.detail.overallScore ?? 0);
        }
        return right.publicSignalScore - left.publicSignalScore;
      });

    const rankByProductId = new Map(coreResults.map((result, index) => [result.detail.product.id, index + 1]));

    return scoredProducts
      .map((result) => ({
        ...result.detail,
        rank: rankByProductId.get(result.detail.product.id) ?? null
      }))
      .sort((left, right) => {
        const comparabilityOrder = this.getComparabilityOrder(left.product.comparability) - this.getComparabilityOrder(right.product.comparability);
        if (comparabilityOrder !== 0) {
          return comparabilityOrder;
        }
        if ((right.overallScore ?? -1) !== (left.overallScore ?? -1)) {
          return (right.overallScore ?? -1) - (left.overallScore ?? -1);
        }
        if (right.scoreBreakdown.publicSignalScore !== left.scoreBreakdown.publicSignalScore) {
          return right.scoreBreakdown.publicSignalScore - left.scoreBreakdown.publicSignalScore;
        }
        return left.product.displayName.localeCompare(right.product.displayName);
      });
  };

  createScoredDetail = (seed: ProductSeed): ProductScoreResult => {
    const publicMetrics = this.createPublicMetrics(seed.repoStats, seed.product.sources.some((source) => source.kind === "docs"));
    const publicSignalScore = publicMetrics.reduce((total, metric) => total + metric.points, 0);
    const capabilityAssessments = this.createCapabilityAssessments(seed.capabilityAssessments);
    const capabilityScore = capabilityAssessments.reduce((total, capability) => total + capability.points, 0);
    const overallScore = seed.product.comparability === "core"
      ? Number((publicSignalScore + capabilityScore).toFixed(1))
      : null;

    return {
      publicSignalScore,
      capabilityScore,
      detail: {
        product: seed.product,
        repoStats: seed.repoStats,
        overallScore,
        rank: null,
        inclusionLabel: COMPARABILITY_LABELS[seed.product.comparability],
        notRankedReason: seed.product.comparability === "core"
          ? null
          : "当前只对 core comparable 层做统一总榜；这个产品保留在市场地图中，但不参与统一总分排序。",
        scoreBreakdown: {
          publicSignalScore,
          capabilityScore,
          overallScore
        },
        publicMetrics,
        inclusionChecks: seed.inclusionChecks,
        capabilityAssessments,
        strengths: this.pickStrengths(capabilityAssessments, publicSignalScore),
        evidence: this.dataService.getEvidenceForProduct(seed.product.id)
      }
    };
  };

  createPublicMetrics = (repoStats: RepoStats | null, hasDocs: boolean): PublicMetric[] => {
    const stars = repoStats?.stars ?? 0;
    const forks = repoStats?.forks ?? 0;
    const daysSincePush = repoStats ? this.calculateDaysSincePush(repoStats.pushedAt) : Number.POSITIVE_INFINITY;
    const license = repoStats?.license ?? null;

    return [
      {
        id: "stars",
        label: "GitHub Stars",
        rawValue: stars.toLocaleString("en-US"),
        points: this.scoreStars(stars),
        maxPoints: 18,
        summary: "衡量公开关注度，但不直接等于产品能力。"
      },
      {
        id: "forks",
        label: "GitHub Forks",
        rawValue: forks.toLocaleString("en-US"),
        points: this.scoreForks(forks),
        maxPoints: 8,
        summary: "用来补充社区跟进与二次开发热度。"
      },
      {
        id: "activity",
        label: "Recent Activity",
        rawValue: Number.isFinite(daysSincePush) ? `${daysSincePush} 天内有更新` : "未提供 repo 数据",
        points: this.scoreActivity(daysSincePush),
        maxPoints: 6,
        summary: "按最近一次公开 push 的新鲜度给分。"
      },
      {
        id: "docs",
        label: "Official Docs",
        rawValue: hasDocs ? "有官方 docs" : "未见官方 docs",
        points: hasDocs ? 4 : 0,
        maxPoints: 4,
        summary: "只要官方 docs 明确存在，就给满分。"
      },
      {
        id: "license",
        label: "Open License",
        rawValue: license ?? "未声明",
        points: this.scoreLicense(license),
        maxPoints: 4,
        summary: "只按公开许可证是否清晰打分。"
      }
    ];
  };

  createCapabilityAssessments = (capabilities: CapabilityAssessmentSeed[]): CapabilityAssessment[] => {
    return capabilities.map((capability) => ({
      ...capability,
      points: this.scoreCapabilityStatus(capability.status),
      maxPoints: CAPABILITY_MAX_POINTS
    }));
  };

  pickStrengths = (capabilities: CapabilityAssessment[], publicSignalScore: number): string[] => {
    const capabilityStrengths = capabilities
      .filter((capability) => capability.status === "yes")
      .slice(0, 3)
      .map((capability) => capability.label);

    if (publicSignalScore >= 30) {
      capabilityStrengths.push("公共信号强");
    }

    return capabilityStrengths.slice(0, 4);
  };

  createSpotlightBoards = (productDetails: ProductDetail[]): SpotlightBoard[] => {
    return [
      {
        id: "public-signal",
        label: "公共信号榜",
        description: "跨整个 universe，只看 GitHub stars、forks、活跃度、docs 和许可证清晰度。",
        metricLabel: "公共信号分",
        items: this.createSpotlightItems(productDetails, (detail) => detail.scoreBreakdown.publicSignalScore, 40)
      },
      {
        id: "capability-coverage",
        label: "能力覆盖榜",
        description: "跨整个 universe，只看公开可验证能力覆盖，不管它最后是否进 core 总榜。",
        metricLabel: "能力覆盖分",
        items: this.createSpotlightItems(productDetails, (detail) => detail.scoreBreakdown.capabilityScore, 60)
      }
    ];
  };

  createSpotlightItems = (
    productDetails: ProductDetail[],
    getScore: (detail: ProductDetail) => number,
    maxScore: number
  ): SpotlightBoardItem[] => {
    return [...productDetails]
      .sort((left, right) => {
        if (getScore(right) !== getScore(left)) {
          return getScore(right) - getScore(left);
        }
        return left.product.displayName.localeCompare(right.product.displayName);
      })
      .slice(0, 5)
      .map((detail) => ({
        productId: detail.product.id,
        label: detail.product.displayName,
        score: getScore(detail),
        valueLabel: `${getScore(detail).toFixed(1)} / ${maxScore}`,
        comparability: detail.product.comparability
      }));
  };

  getComparabilityOrder = (comparability: ProductComparability): number => {
    if (comparability === "core") {
      return 0;
    }
    if (comparability === "adjacent") {
      return 1;
    }
    return 2;
  };

  scoreCapabilityStatus = (status: CapabilityStatus): number => {
    if (status === "yes") {
      return CAPABILITY_MAX_POINTS;
    }
    if (status === "partial") {
      return CAPABILITY_MAX_POINTS / 2;
    }
    return 0;
  };

  scoreStars = (stars: number): number => {
    if (stars >= 100000) {
      return 18;
    }
    if (stars >= 30000) {
      return 15;
    }
    if (stars >= 10000) {
      return 12;
    }
    if (stars >= 3000) {
      return 9;
    }
    if (stars >= 1000) {
      return 6;
    }
    if (stars >= 300) {
      return 3;
    }
    if (stars > 0) {
      return 1;
    }
    return 0;
  };

  scoreForks = (forks: number): number => {
    if (forks >= 20000) {
      return 8;
    }
    if (forks >= 5000) {
      return 6;
    }
    if (forks >= 1000) {
      return 4;
    }
    if (forks >= 200) {
      return 2;
    }
    if (forks > 0) {
      return 1;
    }
    return 0;
  };

  scoreActivity = (daysSincePush: number): number => {
    if (daysSincePush <= 7) {
      return 6;
    }
    if (daysSincePush <= 30) {
      return 5;
    }
    if (daysSincePush <= 90) {
      return 4;
    }
    if (daysSincePush <= 180) {
      return 3;
    }
    if (daysSincePush <= 365) {
      return 2;
    }
    if (Number.isFinite(daysSincePush)) {
      return 1;
    }
    return 0;
  };

  scoreLicense = (license: string | null): number => {
    if (!license || license === "NOASSERTION") {
      return 0;
    }
    return 4;
  };

  calculateDaysSincePush = (pushedAt: string): number => {
    const generatedAt = new Date(this.dataService.getGeneratedAt());
    const pushedAtDate = new Date(pushedAt);
    const diffMs = generatedAt.getTime() - pushedAtDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };
}
