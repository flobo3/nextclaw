import type { PublicItem } from "../../shared/public-roadmap-feedback-portal.types.js";
import type {
  StoredCommentEntry,
  StoredFeedbackEntry,
  StoredVoteEntry
} from "../community/portal-community.types.js";

export const PORTAL_PREVIEW_ITEMS: PublicItem[] = [
  {
    id: "pulse-001",
    slug: "public-roadmap-feedback-portal",
    title: "公开路线图与反馈门户",
    summary: "把官方规划、进展、已交付事项和用户反馈统一到一个公开入口。",
    description:
      "首版先提供只读路线图、公开阶段、类型筛选、更新流与详情页。后续阶段会接入 Linear 同步，并补齐建议、投票、评论和关联反馈。",
    publicPhase: "building",
    type: "feature",
    source: "manual-official",
    isOfficial: true,
    tags: ["roadmap", "feedback", "cloudflare"],
    updatedAt: "2026-04-14T08:30:00.000Z",
    shippedAt: null,
    engagement: {
      voteCount: 18,
      commentCount: 1,
      linkedFeedbackCount: 0
    },
    sourceMetadata: {
      provider: "manual-official",
      sourceLabel: "Phase 3 preview",
      sourceStatus: "In Progress",
      sourceUrl: null,
      teamName: "NextClaw",
      labelNames: ["feature", "public"]
    }
  },
  {
    id: "pulse-002",
    slug: "linear-source-adapter",
    title: "Linear 数据源适配层",
    summary: "把 Linear 作为首个官方数据源接入，但不把 Linear 结构暴露给前端。",
    description:
      "通过 SourceAdapter 和 SourceSyncManager 承接外部系统同步，公开 API 始终只输出 PublicItem 等产品级对象，为后续接 Jira、GitHub Projects 或手工录入保留空间。",
    publicPhase: "planned",
    type: "improvement",
    source: "manual-official",
    isOfficial: true,
    tags: ["linear", "adapter", "sync"],
    updatedAt: "2026-04-14T08:00:00.000Z",
    shippedAt: null,
    engagement: {
      voteCount: 11,
      commentCount: 0,
      linkedFeedbackCount: 0
    },
    sourceMetadata: {
      provider: "manual-official",
      sourceLabel: "Phase 2 live sync",
      sourceStatus: "Todo",
      sourceUrl: null,
      teamName: "NextClaw",
      labelNames: ["integration", "source-adapter"]
    }
  },
  {
    id: "pulse-003",
    slug: "community-feedback-loop",
    title: "社区建议、点赞与评论",
    summary: "让用户不加入内部 Linear，也能提出需求、表达优先级并参与讨论。",
    description:
      "社区反馈会独立存储在 Portal 自己的数据面中。首版不会把评论和投票回写 Linear，避免公开互动与内部执行系统强耦合。",
    publicPhase: "building",
    type: "feature",
    source: "manual-official",
    isOfficial: true,
    tags: ["community", "vote", "comment"],
    updatedAt: "2026-04-14T09:10:00.000Z",
    shippedAt: null,
    engagement: {
      voteCount: 15,
      commentCount: 0,
      linkedFeedbackCount: 0
    },
    sourceMetadata: {
      provider: "manual-official",
      sourceLabel: "Phase 3 building",
      sourceStatus: "In Progress",
      sourceUrl: null,
      teamName: "NextClaw",
      labelNames: ["feedback", "community"]
    }
  },
  {
    id: "pulse-004",
    slug: "public-phase-model",
    title: "公开阶段模型",
    summary: "用 Considering / Planned / Building / Reviewing / Shipped 表达对外进度。",
    description:
      "公开阶段模型让外部用户理解产品进展，同时保留 sourceStatus 承接 Linear 原始状态。这样可以避免把内部工作流直接暴露给用户。",
    publicPhase: "reviewing",
    type: "research",
    source: "manual-official",
    isOfficial: true,
    tags: ["modeling", "roadmap", "ux"],
    updatedAt: "2026-04-14T06:30:00.000Z",
    shippedAt: null,
    engagement: {
      voteCount: 9,
      commentCount: 0,
      linkedFeedbackCount: 0
    },
    sourceMetadata: {
      provider: "manual-official",
      sourceLabel: "Design review",
      sourceStatus: "In Review",
      sourceUrl: null,
      teamName: "NextClaw",
      labelNames: ["model", "public-phase"]
    }
  },
  {
    id: "pulse-005",
    slug: "project-pulse-doc-foundation",
    title: "Project Pulse 方案沉淀",
    summary: "沉淀公开产品脉搏页面的目标、口径、数据来源和验收方式。",
    description:
      "早期 Project Pulse 方案确认了 NextClaw 需要一个能展示持续演进、持续交付和工程克制的公开入口。本门户是这个方向的产品化延伸。",
    publicPhase: "shipped",
    type: "research",
    source: "manual-official",
    isOfficial: true,
    tags: ["docs", "pulse", "foundation"],
    updatedAt: "2026-04-04T09:00:00.000Z",
    shippedAt: "2026-04-04T09:00:00.000Z",
    engagement: {
      voteCount: 6,
      commentCount: 0,
      linkedFeedbackCount: 0
    },
    sourceMetadata: {
      provider: "manual-official",
      sourceLabel: "Design shipped",
      sourceStatus: "Done",
      sourceUrl: null,
      teamName: "NextClaw",
      labelNames: ["docs", "planning"]
    }
  },
  {
    id: "pulse-006",
    slug: "maintainability-first-architecture",
    title: "可维护性优先的门户架构",
    summary: "前端使用 presenter / manager / store，后端使用 query service，避免补丁式叠加。",
    description:
      "第一期从目录和 owner 边界开始约束，不把业务逻辑散落在组件、effect、controller 或无主 helper 中。后续增长必须继续沿这些 owner 扩展。",
    publicPhase: "shipped",
    type: "improvement",
    source: "manual-official",
    isOfficial: true,
    tags: ["maintainability", "architecture"],
    updatedAt: "2026-04-14T08:45:00.000Z",
    shippedAt: "2026-04-14T08:45:00.000Z",
    engagement: {
      voteCount: 8,
      commentCount: 0,
      linkedFeedbackCount: 0
    },
    sourceMetadata: {
      provider: "manual-official",
      sourceLabel: "Phase 1 shipped",
      sourceStatus: "Done",
      sourceUrl: null,
      teamName: "NextClaw",
      labelNames: ["architecture", "quality"]
    }
  }
];

export const PORTAL_PREVIEW_FEEDBACK_ENTRIES: StoredFeedbackEntry[] = [
  {
    id: "feedback-001",
    slug: "public-roadmap-email-subscribe",
    title: "希望能订阅路线图更新",
    description: "如果我对某个事项感兴趣，希望能在状态变化时收到邮件或站内更新提醒。",
    category: "feature",
    status: "reviewing",
    authorLabel: "早期用户",
    tags: ["updates", "notification"],
    createdAt: "2026-04-13T10:20:00.000Z",
    updatedAt: "2026-04-14T07:30:00.000Z",
    linkedItemId: "pulse-001",
    seedVoteCount: 7,
    seedCommentCount: 1
  },
  {
    id: "feedback-002",
    slug: "public-roadmap-filter-by-channel",
    title: "想按渠道或产品线筛选路线图",
    description: "如果后面 NextClaw 同时覆盖桌面端、Web 和插件，希望我能快速筛出自己关心的那一块。",
    category: "improvement",
    status: "open",
    authorLabel: "社区观察员",
    tags: ["filter", "product-line"],
    createdAt: "2026-04-13T12:10:00.000Z",
    updatedAt: "2026-04-14T06:50:00.000Z",
    linkedItemId: null,
    seedVoteCount: 5,
    seedCommentCount: 0
  },
  {
    id: "feedback-003",
    slug: "linear-public-comments-context",
    title: "希望官方事项详情能带更多上下文",
    description: "除了简短说明，我还想看到为什么现在排这个优先级，以及它和前后事项的关系。",
    category: "research",
    status: "linked",
    authorLabel: "产品体验党",
    tags: ["context", "detail"],
    createdAt: "2026-04-12T08:40:00.000Z",
    updatedAt: "2026-04-14T05:40:00.000Z",
    linkedItemId: "pulse-004",
    seedVoteCount: 4,
    seedCommentCount: 1
  }
];

export const PORTAL_PREVIEW_COMMENTS: StoredCommentEntry[] = [
  {
    id: "comment-001",
    targetType: "item",
    targetId: "pulse-001",
    body: "如果能把官方事项和社区声音统一在一个页面里，传播效果会比单纯贴 Linear 截图好很多。",
    authorLabel: "产品伙伴",
    createdAt: "2026-04-14T06:40:00.000Z"
  },
  {
    id: "comment-002",
    targetType: "feedback",
    targetId: "feedback-001",
    body: "订阅提醒很有用，尤其是对已经点赞过的事项。",
    authorLabel: "等待发布的人",
    createdAt: "2026-04-14T07:10:00.000Z"
  },
  {
    id: "comment-003",
    targetType: "feedback",
    targetId: "feedback-003",
    body: "优先级背景如果能讲清楚，会更容易让外部用户理解节奏。",
    authorLabel: "体验研究员",
    createdAt: "2026-04-14T07:20:00.000Z"
  }
];

export const PORTAL_PREVIEW_VOTES: StoredVoteEntry[] = [
  {
    id: "vote-001",
    targetType: "item",
    targetId: "pulse-001",
    createdAt: "2026-04-14T06:00:00.000Z"
  },
  {
    id: "vote-002",
    targetType: "item",
    targetId: "pulse-003",
    createdAt: "2026-04-14T06:02:00.000Z"
  },
  {
    id: "vote-003",
    targetType: "feedback",
    targetId: "feedback-001",
    createdAt: "2026-04-14T06:05:00.000Z"
  },
  {
    id: "vote-004",
    targetType: "feedback",
    targetId: "feedback-001",
    createdAt: "2026-04-14T06:06:00.000Z"
  },
  {
    id: "vote-005",
    targetType: "feedback",
    targetId: "feedback-002",
    createdAt: "2026-04-14T06:07:00.000Z"
  }
];
