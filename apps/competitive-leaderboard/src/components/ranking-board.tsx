import type { ProductDetail } from "@shared/competitive-leaderboard.types";
import { formatScore } from "../lib/leaderboard-format.utils";
import { Panel } from "./panel";

type RankingBoardProps = {
  ranking: ProductDetail[];
  onInspect: (productId: string) => void;
};

export function RankingBoard({ ranking, onInspect }: RankingBoardProps): JSX.Element {
  return (
    <Panel
      eyebrow="Core Leaderboard"
      title="只对真正同类的一层做统一总榜"
      subtitle="总分由公共信号 40 分和能力覆盖 60 分组成。不是同类的产品再强，也不会被硬塞进这张榜。"
    >
      <div className="ranking-list">
        {ranking.map((detail) => (
          <article key={detail.product.id} className="ranking-card">
            <div className="ranking-card__left">
              <div className="ranking-card__rank">#{detail.rank}</div>
              <div>
                <div className="ranking-card__name-row">
                  <h3>{detail.product.displayName}</h3>
                  <span className="ranking-card__badge">{detail.product.category}</span>
                </div>
                <p className="ranking-card__summary">{detail.product.positioning}</p>
                <div className="ranking-card__chips">
                  {detail.strengths.map((strength) => (
                    <span key={strength} className="ranking-card__chip">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="ranking-card__right">
              <div className="ranking-card__score">{formatScore(detail.overallScore)}</div>
              <div className="ranking-card__subscore">公共信号 {detail.scoreBreakdown.publicSignalScore.toFixed(1)} / 40</div>
              <div className="ranking-card__subscore">能力覆盖 {detail.scoreBreakdown.capabilityScore.toFixed(1)} / 60</div>
              <button type="button" className="ranking-card__button" onClick={() => onInspect(detail.product.id)}>
                看证据
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
