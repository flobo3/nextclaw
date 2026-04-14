export const PUBLIC_PHASES = [
  "considering",
  "planned",
  "building",
  "reviewing",
  "shipped",
  "closed"
] as const;

export type PublicPhase = (typeof PUBLIC_PHASES)[number];

export const PUBLIC_ITEM_TYPES = [
  "feature",
  "bug",
  "improvement",
  "research"
] as const;

export type PublicItemType = (typeof PUBLIC_ITEM_TYPES)[number];

export type PortalDataMode = "preview" | "live";

export type RoadmapViewMode = "board" | "list";

export type ItemSortMode = "recent" | "hot";

export type PublicItemSource = "manual-official" | "linear" | "community";

export const COMMUNITY_FEEDBACK_STATUSES = [
  "open",
  "reviewing",
  "linked",
  "closed"
] as const;

export type CommunityFeedbackStatus = (typeof COMMUNITY_FEEDBACK_STATUSES)[number];

export const PORTAL_TARGET_TYPES = ["item", "feedback"] as const;

export type PortalTargetType = (typeof PORTAL_TARGET_TYPES)[number];

export type EngagementSummary = {
  voteCount: number;
  commentCount: number;
  linkedFeedbackCount: number;
};

export type SourceMetadata = {
  provider: PublicItemSource;
  sourceLabel: string;
  sourceStatus: string;
  sourceUrl: string | null;
  teamName: string | null;
  labelNames: string[];
};

export type PublicItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  publicPhase: PublicPhase;
  type: PublicItemType;
  source: PublicItemSource;
  isOfficial: boolean;
  tags: string[];
  updatedAt: string;
  shippedAt: string | null;
  engagement: EngagementSummary;
  sourceMetadata: SourceMetadata;
};

export type PhaseSummary = {
  phase: PublicPhase;
  count: number;
};

export type FeedbackLink = {
  itemId: string;
  itemTitle: string;
  itemPhase: PublicPhase;
};

export type CommentEntry = {
  id: string;
  targetType: PortalTargetType;
  targetId: string;
  body: string;
  authorLabel: string;
  createdAt: string;
};

export type FeedbackEntry = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: PublicItemType;
  status: CommunityFeedbackStatus;
  authorLabel: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  linkedItem: FeedbackLink | null;
  engagement: {
    voteCount: number;
    commentCount: number;
  };
};

export type FeedbackThread = {
  feedback: FeedbackEntry;
  comments: CommentEntry[];
};

export type PortalOverview = {
  generatedAt: string;
  mode: PortalDataMode;
  summary: {
    totalItems: number;
    activeItems: number;
    shippedItems: number;
    buildingItems: number;
    reviewingItems: number;
    totalFeedback: number;
    openFeedback: number;
    linkedFeedback: number;
    totalSignals: number;
  };
  phaseSummary: PhaseSummary[];
  currentFocus: PublicItem[];
  shippedHighlights: PublicItem[];
};

export type ItemsQuery = {
  phase?: PublicPhase | "all";
  type?: PublicItemType | "all";
  sort?: ItemSortMode;
  view?: RoadmapViewMode;
};

export type ItemsResponse = {
  generatedAt: string;
  mode: PortalDataMode;
  items: PublicItem[];
};

export type FeedbackQuery = {
  status?: CommunityFeedbackStatus | "all";
  linkedItemId?: string | "all";
  sort?: ItemSortMode;
};

export type FeedbackResponse = {
  generatedAt: string;
  mode: PortalDataMode;
  summary: {
    totalFeedback: number;
    openFeedback: number;
    linkedFeedback: number;
    totalVotes: number;
    totalComments: number;
  };
  items: FeedbackThread[];
};

export type UpdatesResponse = {
  generatedAt: string;
  mode: PortalDataMode;
  items: PublicItem[];
};

export type PublicItemDetail = {
  item: PublicItem;
  relatedItems: PublicItem[];
  comments: CommentEntry[];
  linkedFeedback: FeedbackThread[];
};

export type CreateFeedbackInput = {
  title: string;
  description: string;
  category: PublicItemType;
  linkedItemId?: string | null;
  authorLabel?: string;
};

export type CreateCommentInput = {
  body: string;
  authorLabel?: string;
};

export type CreateFeedbackResponse = {
  mode: PortalDataMode;
  item: FeedbackThread;
};

export type CreateCommentResponse = {
  mode: PortalDataMode;
  comment: CommentEntry;
  commentCount: number;
};

export type CreateVoteResponse = {
  mode: PortalDataMode;
  targetType: PortalTargetType;
  targetId: string;
  voteCount: number;
};

export type ApiEnvelope<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };
