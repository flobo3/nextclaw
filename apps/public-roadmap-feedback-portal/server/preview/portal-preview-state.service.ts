import type { CommentEntry, PublicItem } from "../../shared/public-roadmap-feedback-portal.types.js";
import {
  PORTAL_PREVIEW_COMMENTS,
  PORTAL_PREVIEW_FEEDBACK_ENTRIES,
  PORTAL_PREVIEW_ITEMS,
  PORTAL_PREVIEW_VOTES
} from "./portal-preview.config.js";
import type {
  StoredCommentEntry,
  StoredFeedbackEntry,
  StoredVoteEntry
} from "../community/portal-community.types.js";

type PreviewSnapshot = {
  items: PublicItem[];
  feedbackEntries: StoredFeedbackEntry[];
  comments: StoredCommentEntry[];
  votes: StoredVoteEntry[];
};

function clonePublicItem(item: PublicItem): PublicItem {
  return {
    ...item,
    tags: [...item.tags],
    engagement: { ...item.engagement },
    sourceMetadata: {
      ...item.sourceMetadata,
      labelNames: [...item.sourceMetadata.labelNames]
    }
  };
}

function cloneFeedbackEntry(entry: StoredFeedbackEntry): StoredFeedbackEntry {
  return {
    ...entry,
    tags: [...entry.tags]
  };
}

function cloneCommentEntry(entry: CommentEntry): StoredCommentEntry {
  return {
    ...entry
  };
}

function cloneVoteEntry(entry: StoredVoteEntry): StoredVoteEntry {
  return {
    ...entry
  };
}

export class PortalPreviewStateService {
  snapshot: PreviewSnapshot;

  constructor() {
    this.snapshot = this.createInitialSnapshot();
  }

  listItems = (): PublicItem[] => {
    return this.snapshot.items.map(clonePublicItem);
  };

  getItem = async (itemId: string): Promise<PublicItem | null> => {
    const item = this.snapshot.items.find((entry) => entry.id === itemId || entry.slug === itemId);
    return item ? clonePublicItem(item) : null;
  };

  listFeedbackEntries = (): StoredFeedbackEntry[] => {
    return this.snapshot.feedbackEntries.map(cloneFeedbackEntry);
  };

  getFeedbackEntry = async (feedbackId: string): Promise<StoredFeedbackEntry | null> => {
    const feedback = this.snapshot.feedbackEntries.find((entry) => entry.id === feedbackId || entry.slug === feedbackId);
    return feedback ? cloneFeedbackEntry(feedback) : null;
  };

  createFeedbackEntry = async (entry: StoredFeedbackEntry): Promise<void> => {
    this.snapshot.feedbackEntries = [cloneFeedbackEntry(entry), ...this.snapshot.feedbackEntries];
  };

  listComments = (): StoredCommentEntry[] => {
    return this.snapshot.comments.map(cloneCommentEntry);
  };

  createComment = async (comment: StoredCommentEntry): Promise<void> => {
    this.snapshot.comments = [cloneCommentEntry(comment), ...this.snapshot.comments];
  };

  countComments = async (targetType: StoredCommentEntry["targetType"], targetId: string): Promise<number> => {
    return this.snapshot.comments.filter((comment) => comment.targetType === targetType && comment.targetId === targetId).length;
  };

  listVotes = (): StoredVoteEntry[] => {
    return this.snapshot.votes.map(cloneVoteEntry);
  };

  createVote = async (vote: StoredVoteEntry): Promise<void> => {
    this.snapshot.votes = [cloneVoteEntry(vote), ...this.snapshot.votes];
  };

  countVotes = async (targetType: StoredVoteEntry["targetType"], targetId: string): Promise<number> => {
    return this.snapshot.votes.filter((vote) => vote.targetType === targetType && vote.targetId === targetId).length;
  };

  private createInitialSnapshot = (): PreviewSnapshot => {
    return {
      items: PORTAL_PREVIEW_ITEMS.map(clonePublicItem),
      feedbackEntries: PORTAL_PREVIEW_FEEDBACK_ENTRIES.map(cloneFeedbackEntry),
      comments: PORTAL_PREVIEW_COMMENTS.map(cloneCommentEntry),
      votes: PORTAL_PREVIEW_VOTES.map(cloneVoteEntry)
    };
  };
}

const portalPreviewStateService = new PortalPreviewStateService();

export function getPortalPreviewStateService(): PortalPreviewStateService {
  return portalPreviewStateService;
}
