import type {
  CommentEntry,
  CommunityFeedbackStatus,
  PortalTargetType,
  PublicItemType
} from "../../shared/public-roadmap-feedback-portal.types.js";

export type StoredFeedbackEntry = {
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
  linkedItemId: string | null;
  seedVoteCount: number;
  seedCommentCount: number;
};

export type StoredVoteEntry = {
  id: string;
  targetType: PortalTargetType;
  targetId: string;
  createdAt: string;
};

export type StoredCommentEntry = CommentEntry;
