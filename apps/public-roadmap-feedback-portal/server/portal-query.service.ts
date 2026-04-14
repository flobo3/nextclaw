import {
  COMMUNITY_FEEDBACK_STATUSES,
  PUBLIC_PHASES,
  type CommentEntry,
  type FeedbackEntry,
  type FeedbackQuery,
  type FeedbackResponse,
  type FeedbackThread,
  type ItemSortMode,
  type ItemsQuery,
  type ItemsResponse,
  type PortalDataMode,
  type PortalOverview,
  type PortalTargetType,
  type PublicItem,
  type PublicItemDetail,
  type PublicItemType,
  type PublicPhase,
  type UpdatesResponse
} from "../shared/public-roadmap-feedback-portal.types.js";
import type { StoredFeedbackEntry, StoredVoteEntry } from "./community/portal-community.types.js";

const ACTIVE_PHASES = new Set<PublicPhase>(["considering", "planned", "building", "reviewing"]);

type PortalQueryServiceParams = {
  mode?: PortalDataMode;
  items?: PublicItem[];
  feedbackEntries?: StoredFeedbackEntry[];
  comments?: CommentEntry[];
  votes?: StoredVoteEntry[];
};

export class PortalQueryService {
  readonly mode: PortalDataMode;
  readonly items: PublicItem[];
  readonly feedbackEntries: StoredFeedbackEntry[];
  readonly comments: CommentEntry[];
  readonly votes: StoredVoteEntry[];

  constructor(params?: PortalQueryServiceParams) {
    const {
      mode = "preview",
      items = [],
      feedbackEntries = [],
      comments = [],
      votes = []
    } = params ?? {};
    this.mode = mode;
    this.items = items;
    this.feedbackEntries = feedbackEntries;
    this.comments = comments;
    this.votes = votes;
  }

  getOverview = (): PortalOverview => {
    const itemMap = this.createItemMap();
    const feedbackMap = this.createFeedbackMap(itemMap);
    const items = this.items.map((item) => this.enrichPublicItem(item));
    const feedbackEntries = this.feedbackEntries.map((entry) => feedbackMap.get(entry.id) ?? this.mapFeedbackEntry(entry, itemMap));
    const totalSignals = items.reduce((sum, item) => {
      return sum + item.engagement.voteCount + item.engagement.commentCount + item.engagement.linkedFeedbackCount;
    }, 0) + feedbackEntries.reduce((sum, entry) => {
      return sum + entry.engagement.voteCount + entry.engagement.commentCount;
    }, 0);

    return {
      generatedAt: new Date().toISOString(),
      mode: this.mode,
      summary: {
        totalItems: items.length,
        activeItems: items.filter((item) => ACTIVE_PHASES.has(item.publicPhase)).length,
        shippedItems: items.filter((item) => item.publicPhase === "shipped").length,
        buildingItems: items.filter((item) => item.publicPhase === "building").length,
        reviewingItems: items.filter((item) => item.publicPhase === "reviewing").length,
        totalFeedback: feedbackEntries.length,
        openFeedback: feedbackEntries.filter((entry) => entry.status === "open" || entry.status === "reviewing").length,
        linkedFeedback: feedbackEntries.filter((entry) => entry.linkedItem).length,
        totalSignals
      },
      phaseSummary: PUBLIC_PHASES.map((phase) => ({
        phase,
        count: items.filter((item) => item.publicPhase === phase).length
      })),
      currentFocus: this.sortItems(items.filter((item) => item.publicPhase === "building" || item.publicPhase === "reviewing"), "hot").slice(0, 3),
      shippedHighlights: this.getShippedItems(items).slice(0, 3)
    };
  };

  listItems = (query: ItemsQuery): ItemsResponse => {
    const items = this.items
      .map((item) => this.enrichPublicItem(item))
      .filter((item) => {
        const phaseMatched = !query.phase || query.phase === "all" || item.publicPhase === query.phase;
        const typeMatched = !query.type || query.type === "all" || item.type === query.type;
        return phaseMatched && typeMatched;
      });

    return {
      generatedAt: new Date().toISOString(),
      mode: this.mode,
      items: this.sortItems(items, query.sort ?? "recent")
    };
  };

  getItemDetail = (itemId: string): PublicItemDetail => {
    const item = this.items.find((entry) => entry.id === itemId || entry.slug === itemId);
    if (!item) {
      throw new Error(`Unknown public roadmap item: ${itemId}`);
    }

    const itemMap = this.createItemMap();
    const feedbackMap = this.createFeedbackMap(itemMap);
    const detailItem = this.enrichPublicItem(item);
    const itemComments = this.getCommentsByTarget("item", detailItem.id);
    const linkedFeedback = this.createFeedbackThreads(
      this.feedbackEntries.filter((entry) => entry.linkedItemId === detailItem.id),
      feedbackMap
    );

    return {
      item: detailItem,
      relatedItems: this.sortItems(
        this.items
          .filter((entry) => entry.id !== detailItem.id && this.isRelated(entry, item))
          .map((entry) => this.enrichPublicItem(entry)),
        "hot"
      ).slice(0, 3),
      comments: itemComments,
      linkedFeedback
    };
  };

  listFeedback = (query: FeedbackQuery): FeedbackResponse => {
    const itemMap = this.createItemMap();
    const feedbackMap = this.createFeedbackMap(itemMap);
    const feedbackThreads = this.createFeedbackThreads(
      this.feedbackEntries.filter((entry) => {
        const statusMatched = !query.status || query.status === "all" || entry.status === query.status;
        const itemMatched = !query.linkedItemId || query.linkedItemId === "all" || entry.linkedItemId === query.linkedItemId;
        return statusMatched && itemMatched;
      }),
      feedbackMap
    );
    const sortedThreads = this.sortFeedbackThreads(feedbackThreads, query.sort ?? "recent");

    return {
      generatedAt: new Date().toISOString(),
      mode: this.mode,
      summary: {
        totalFeedback: feedbackThreads.length,
        openFeedback: feedbackThreads.filter((thread) => thread.feedback.status === "open" || thread.feedback.status === "reviewing").length,
        linkedFeedback: feedbackThreads.filter((thread) => thread.feedback.linkedItem).length,
        totalVotes: feedbackThreads.reduce((sum, thread) => sum + thread.feedback.engagement.voteCount, 0),
        totalComments: feedbackThreads.reduce((sum, thread) => sum + thread.feedback.engagement.commentCount, 0)
      },
      items: sortedThreads
    };
  };

  getFeedbackThread = (feedbackId: string): FeedbackThread => {
    const itemMap = this.createItemMap();
    const feedbackMap = this.createFeedbackMap(itemMap);
    const feedbackEntry = this.feedbackEntries.find((entry) => entry.id === feedbackId || entry.slug === feedbackId);
    if (!feedbackEntry) {
      throw new Error(`Unknown feedback entry: ${feedbackId}`);
    }
    return this.createFeedbackThreads([feedbackEntry], feedbackMap)[0];
  };

  getUpdates = (): UpdatesResponse => {
    return {
      generatedAt: new Date().toISOString(),
      mode: this.mode,
      items: this.getShippedItems(this.items.map((item) => this.enrichPublicItem(item)))
    };
  };

  isKnownPhase = (phase: string): phase is PublicPhase => {
    return PUBLIC_PHASES.includes(phase as PublicPhase);
  };

  isKnownType = (type: string): type is PublicItemType => {
    return ["feature", "bug", "improvement", "research"].includes(type);
  };

  isKnownFeedbackStatus = (status: string): boolean => {
    return COMMUNITY_FEEDBACK_STATUSES.includes(status as never);
  };

  private createItemMap = (): Map<string, PublicItem> => {
    return new Map(this.items.map((item) => [item.id, this.enrichPublicItem(item)]));
  };

  private createFeedbackMap = (itemMap: Map<string, PublicItem>): Map<string, FeedbackEntry> => {
    return new Map(this.feedbackEntries.map((entry) => [entry.id, this.mapFeedbackEntry(entry, itemMap)]));
  };

  private enrichPublicItem = (item: PublicItem): PublicItem => {
    const communityVotes = this.countVotes("item", item.id);
    const communityComments = this.countComments("item", item.id);
    const linkedFeedbackCount = this.feedbackEntries.filter((entry) => entry.linkedItemId === item.id).length;

    return {
      ...item,
      tags: [...item.tags],
      engagement: {
        voteCount: item.engagement.voteCount + communityVotes,
        commentCount: item.engagement.commentCount + communityComments,
        linkedFeedbackCount: item.engagement.linkedFeedbackCount + linkedFeedbackCount
      },
      sourceMetadata: {
        ...item.sourceMetadata,
        labelNames: [...item.sourceMetadata.labelNames]
      }
    };
  };

  private mapFeedbackEntry = (entry: StoredFeedbackEntry, itemMap: Map<string, PublicItem>): FeedbackEntry => {
    const linkedItem = entry.linkedItemId ? itemMap.get(entry.linkedItemId) ?? null : null;
    return {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      category: entry.category,
      status: entry.status,
      authorLabel: entry.authorLabel,
      tags: [...entry.tags],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      linkedItem: linkedItem ? {
        itemId: linkedItem.id,
        itemTitle: linkedItem.title,
        itemPhase: linkedItem.publicPhase
      } : null,
      engagement: {
        voteCount: entry.seedVoteCount + this.countVotes("feedback", entry.id),
        commentCount: entry.seedCommentCount + this.countComments("feedback", entry.id)
      }
    };
  };

  private createFeedbackThreads = (
    entries: StoredFeedbackEntry[],
    feedbackMap: Map<string, FeedbackEntry>
  ): FeedbackThread[] => {
    return entries.map((entry) => ({
      feedback: feedbackMap.get(entry.id) ?? this.mapFeedbackEntry(entry, this.createItemMap()),
      comments: this.getCommentsByTarget("feedback", entry.id)
    }));
  };

  private getShippedItems = (items: PublicItem[]): PublicItem[] => {
    return [...items]
      .filter((item) => item.publicPhase === "shipped")
      .sort((left, right) => `${right.shippedAt ?? right.updatedAt}`.localeCompare(`${left.shippedAt ?? left.updatedAt}`));
  };

  private sortItems = (items: PublicItem[], sort: ItemSortMode): PublicItem[] => {
    if (sort === "hot") {
      return [...items].sort((left, right) => {
        const rightScore = this.getItemHotScore(right);
        const leftScore = this.getItemHotScore(left);
        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
    }

    return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  };

  private sortFeedbackThreads = (items: FeedbackThread[], sort: ItemSortMode): FeedbackThread[] => {
    if (sort === "hot") {
      return [...items].sort((left, right) => {
        const rightScore = this.getFeedbackHotScore(right.feedback);
        const leftScore = this.getFeedbackHotScore(left.feedback);
        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }
        return right.feedback.updatedAt.localeCompare(left.feedback.updatedAt);
      });
    }

    return [...items].sort((left, right) => right.feedback.updatedAt.localeCompare(left.feedback.updatedAt));
  };

  private getCommentsByTarget = (targetType: PortalTargetType, targetId: string): CommentEntry[] => {
    return this.comments
      .filter((entry) => entry.targetType === targetType && entry.targetId === targetId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((entry) => ({ ...entry }));
  };

  private countComments = (targetType: PortalTargetType, targetId: string): number => {
    return this.comments.filter((entry) => entry.targetType === targetType && entry.targetId === targetId).length;
  };

  private countVotes = (targetType: PortalTargetType, targetId: string): number => {
    return this.votes.filter((entry) => entry.targetType === targetType && entry.targetId === targetId).length;
  };

  private getItemHotScore = (item: PublicItem): number => {
    return item.engagement.voteCount * 2 + item.engagement.commentCount + item.engagement.linkedFeedbackCount * 3;
  };

  private getFeedbackHotScore = (feedback: FeedbackEntry): number => {
    return feedback.engagement.voteCount * 2 + feedback.engagement.commentCount;
  };

  private isRelated = (entry: PublicItem, item: PublicItem): boolean => {
    if (entry.type === item.type) {
      return true;
    }
    return entry.tags.some((tag) => item.tags.includes(tag));
  };
}
