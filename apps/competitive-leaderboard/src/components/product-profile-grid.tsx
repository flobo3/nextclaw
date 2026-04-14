import type { ProductDetail } from "@shared/competitive-leaderboard.types";
import { formatComparability, formatScore } from "../lib/leaderboard-format.utils";
import { Panel } from "./panel";

type ProductProfileGridProps = {
  productDetails: ProductDetail[];
  onInspect: (productId: string) => void;
};

export function ProductProfileGrid({
  productDetails,
  onInspect
}: ProductProfileGridProps): JSX.Element {
  return (
    <Panel
      eyebrow="Product Profiles"
      title="资料卡比一句排名更有解释力"
      subtitle="每个产品都保留定位、适用人群、边界提醒、公开来源和分数拆解，这样榜单才不只是数字。"
    >
      <div className="profile-grid">
        {productDetails.map((detail) => (
          <article key={detail.product.id} className="profile-card">
            <div className="profile-card__topline">
              <div>
                <h3>{detail.product.displayName}</h3>
                <div className="profile-card__badge-row">
                  <span className="profile-card__badge">{formatComparability(detail.product.comparability)}</span>
                  <span className="profile-card__badge">{detail.product.category}</span>
                </div>
              </div>
              <button type="button" className="profile-card__button" onClick={() => onInspect(detail.product.id)}>
                证据
              </button>
            </div>

            <p className="profile-card__summary">{detail.product.shortDescription}</p>
            <p className="profile-card__detail"><strong>最适合：</strong>{detail.product.bestFor}</p>
            <p className="profile-card__detail"><strong>注意：</strong>{detail.product.caution}</p>
            <p className="profile-card__detail"><strong>总分：</strong>{formatScore(detail.overallScore)}</p>
            <p className="profile-card__detail"><strong>公共信号：</strong>{detail.scoreBreakdown.publicSignalScore.toFixed(1)} / 40</p>
            <p className="profile-card__detail"><strong>能力覆盖：</strong>{detail.scoreBreakdown.capabilityScore.toFixed(1)} / 60</p>

            <div className="profile-card__tags">
              {detail.product.tags.map((tag) => (
                <span key={tag} className="profile-card__tag">
                  {tag}
                </span>
              ))}
            </div>

            <div className="profile-card__sources">
              {detail.product.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
