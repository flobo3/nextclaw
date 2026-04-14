import type { ProductDetail } from "@shared/competitive-leaderboard.types";
import {
  formatCapabilityStatus,
  formatConfidence,
  formatScore
} from "../lib/leaderboard-format.utils";

type EvidenceDrawerProps = {
  detail: ProductDetail | null;
  onClose: () => void;
};

export function EvidenceDrawer({ detail, onClose }: EvidenceDrawerProps): JSX.Element | null {
  if (!detail) {
    return null;
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer__header">
          <div>
            <div className="drawer__eyebrow">{detail.inclusionLabel}</div>
            <h2>{detail.product.displayName}</h2>
            <p>{detail.product.positioning}</p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="drawer__section">
          <div className="drawer__metric">
            <span>总分</span>
            <strong>{formatScore(detail.overallScore)}</strong>
          </div>
          <div className="drawer__metric">
            <span>Rank</span>
            <strong>{detail.rank ? `#${detail.rank}` : "Not Ranked"}</strong>
          </div>
          <div className="drawer__metric">
            <span>公共信号</span>
            <strong>{detail.scoreBreakdown.publicSignalScore.toFixed(1)} / 40</strong>
          </div>
          <div className="drawer__metric">
            <span>能力覆盖</span>
            <strong>{detail.scoreBreakdown.capabilityScore.toFixed(1)} / 60</strong>
          </div>
        </div>

        {detail.repoStats ? (
          <div className="drawer__section">
            <h3>公开指标</h3>
            <div className="drawer__metric-grid">
              <div className="drawer__metric">
                <span>Repo</span>
                <strong>{detail.repoStats.repoFullName}</strong>
              </div>
              <div className="drawer__metric">
                <span>Stars</span>
                <strong>{detail.repoStats.stars.toLocaleString("en-US")}</strong>
              </div>
              <div className="drawer__metric">
                <span>Forks</span>
                <strong>{detail.repoStats.forks.toLocaleString("en-US")}</strong>
              </div>
              <div className="drawer__metric">
                <span>License</span>
                <strong>{detail.repoStats.license ?? "未声明"}</strong>
              </div>
            </div>
          </div>
        ) : null}

        <div className="drawer__section">
          <h3>官方来源</h3>
          <div className="drawer__link-list">
            {detail.product.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            ))}
          </div>
        </div>

        <div className="drawer__section">
          <h3>纳入判断</h3>
          <div className="drawer__score-table">
            {detail.inclusionChecks.map((check) => (
              <article key={check.id} className="drawer__score-row">
                <div className="drawer__score-head">
                  <span>{check.label}</span>
                  <span>{check.passed ? "Pass" : "Fail"}</span>
                </div>
                <p>{check.summary}</p>
              </article>
            ))}
          </div>
          {detail.notRankedReason ? (
            <p className="drawer__empty">{detail.notRankedReason}</p>
          ) : null}
        </div>

        <div className="drawer__section">
          <h3>能力矩阵</h3>
          <div className="drawer__score-table">
            {detail.capabilityAssessments.map((capability) => (
              <article key={capability.id} className="drawer__score-row">
                <div className="drawer__score-head">
                  <span>{capability.label}</span>
                  <span>{formatCapabilityStatus(capability.status)} · {capability.points} / {capability.maxPoints}</span>
                </div>
                <p>{capability.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="drawer__section">
          <h3>公共信号拆解</h3>
          <div className="drawer__score-table">
            {detail.publicMetrics.map((metric) => (
              <article key={metric.id} className="drawer__score-row">
                <div className="drawer__score-head">
                  <span>{metric.label}</span>
                  <span>{metric.rawValue} · {metric.points} / {metric.maxPoints}</span>
                </div>
                <p>{metric.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="drawer__section">
          <h3>证据条目</h3>
          <div className="drawer__evidence-list">
            {detail.evidence.map((evidence) => (
              <article key={evidence.id} className="drawer__evidence-card">
                <div className="drawer__evidence-topline">
                  <span>{evidence.sourceTitle}</span>
                  <span>{evidence.kind} · 置信度 {formatConfidence(evidence.confidence)}</span>
                </div>
                <p>{evidence.summary}</p>
                <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">
                  打开来源
                </a>
              </article>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
