import type { PortalOverview } from "@shared/public-roadmap-feedback-portal.types";
import { Panel } from "../../../shared/components/panel";
import { StatCard } from "../../../shared/components/stat-card";

type OverviewSectionProps = {
  data: PortalOverview | undefined;
  isPending: boolean;
};

export function OverviewSection({ data, isPending }: OverviewSectionProps): JSX.Element {
  return (
    <Panel className="overview-panel">
      <div className="overview-panel__copy">
        <p className="eyebrow">NextClaw Pulse</p>
        <h1>公开路线图与产品进展</h1>
        <p>
          一个面向用户的产品脉搏入口：展示正在规划、构建、验证和已交付的事项。
          现在已经同时覆盖官方路线图和社区反馈，让外部用户能看到进展、表达支持并直接提建议。
        </p>
        {data?.mode === "preview" ? (
          <div className="preview-banner">
            Preview mode · 当前使用显式预览数据与临时交互存储，并未连接真实 Linear / D1
          </div>
        ) : null}
      </div>
      <div className="overview-panel__stats">
        <StatCard
          label="公开事项"
          value={isPending ? "…" : data?.summary.totalItems ?? 0}
          detail="当前门户里可见的官方事项"
        />
        <StatCard
          label="正在推进"
          value={isPending ? "…" : data?.summary.activeItems ?? 0}
          detail="Considering 到 Reviewing 的事项"
        />
        <StatCard
          label="已交付"
          value={isPending ? "…" : data?.summary.shippedItems ?? 0}
          detail="进入 Shipped 的产品进展"
        />
        <StatCard
          label="反馈信号"
          value={isPending ? "…" : data?.summary.totalSignals ?? 0}
          detail="投票、评论与关联建议的总信号"
        />
        <StatCard
          label="社区建议"
          value={isPending ? "…" : data?.summary.totalFeedback ?? 0}
          detail="已公开提交的建议数"
        />
      </div>
    </Panel>
  );
}
