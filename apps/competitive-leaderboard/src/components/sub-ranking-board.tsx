import type { ProductDetail, SpotlightBoard } from "@shared/competitive-leaderboard.types";
import { formatComparability } from "../lib/leaderboard-format.utils";
import { Panel } from "./panel";

type SubRankingBoardProps = {
  subRankings: SpotlightBoard[];
  productDetails: ProductDetail[];
  onInspect: (productId: string) => void;
};

export function SubRankingBoard({
  subRankings,
  productDetails,
  onInspect
}: SubRankingBoardProps): JSX.Element {
  const productNameById = new Map(productDetails.map((detail) => [detail.product.id, detail.product.displayName]));

  return (
    <Panel
      eyebrow="Scoreboards"
      title="把“声量”和“能力”拆开看"
      subtitle="很多争议来自把不同性质的指标搅在一起。把公共信号和能力覆盖拆开，榜单会更诚实。"
    >
      <div className="sub-ranking-grid">
        {subRankings.map((subRanking) => (
          <section key={subRanking.id} className="sub-ranking-card">
            <h3>{subRanking.label}</h3>
            <p>{subRanking.description}</p>
            <div className="sub-ranking-card__items">
              {subRanking.items.map((item, index) => (
                <button
                  key={`${subRanking.id}-${item.productId}`}
                  type="button"
                  className="sub-ranking-item"
                  onClick={() => onInspect(item.productId)}
                >
                  <span className="sub-ranking-item__rank">#{index + 1}</span>
                  <span className="sub-ranking-item__name">
                    {productNameById.get(item.productId) ?? item.label}
                  </span>
                  <span className="sub-ranking-item__score">{item.valueLabel}</span>
                  <span className="sub-ranking-item__meta">{formatComparability(item.comparability)}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}
