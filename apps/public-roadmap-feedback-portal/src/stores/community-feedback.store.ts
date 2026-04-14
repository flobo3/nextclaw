import { create } from "zustand";
import type { ItemSortMode, PublicItemType } from "@shared/public-roadmap-feedback-portal.types";

export type FeedbackDraft = {
  title: string;
  description: string;
  category: PublicItemType;
  linkedItemId: string;
  authorLabel: string;
};

export type CommentDraft = {
  body: string;
  authorLabel: string;
};

export type CommunityFeedbackSnapshot = {
  feedbackDraft: FeedbackDraft;
  feedbackSortMode: ItemSortMode;
  commentDrafts: Record<string, CommentDraft>;
};

type CommunityFeedbackState = {
  snapshot: CommunityFeedbackSnapshot;
  setSnapshot: (patch: Partial<CommunityFeedbackSnapshot>) => void;
};

export const initialFeedbackDraft: FeedbackDraft = {
  title: "",
  description: "",
  category: "feature",
  linkedItemId: "",
  authorLabel: ""
};

const initialSnapshot: CommunityFeedbackSnapshot = {
  feedbackDraft: initialFeedbackDraft,
  feedbackSortMode: "hot",
  commentDrafts: {}
};

export const useCommunityFeedbackStore = create<CommunityFeedbackState>((set) => ({
  snapshot: initialSnapshot,
  setSnapshot: (patch) => set((state) => ({
    snapshot: {
      ...state.snapshot,
      ...patch
    }
  }))
}));
