import type {
  CreateCommentInput,
  CreateFeedbackInput,
  ItemSortMode,
  PortalTargetType,
  PublicItemType
} from "@shared/public-roadmap-feedback-portal.types";
import {
  initialFeedbackDraft,
  useCommunityFeedbackStore,
  type CommentDraft
} from "../stores/community-feedback.store";

const DEFAULT_COMMENT_DRAFT: CommentDraft = {
  body: "",
  authorLabel: ""
};

export class CommunityFeedbackManager {
  setFeedbackTitle = (title: string): void => {
    this.patchFeedbackDraft({ title });
  };

  setFeedbackDescription = (description: string): void => {
    this.patchFeedbackDraft({ description });
  };

  setFeedbackCategory = (category: PublicItemType): void => {
    this.patchFeedbackDraft({ category });
  };

  setFeedbackLinkedItemId = (linkedItemId: string): void => {
    this.patchFeedbackDraft({ linkedItemId });
  };

  setFeedbackAuthorLabel = (authorLabel: string): void => {
    this.patchFeedbackDraft({ authorLabel });
  };

  setFeedbackSortMode = (feedbackSortMode: ItemSortMode): void => {
    useCommunityFeedbackStore.getState().setSnapshot({ feedbackSortMode });
  };

  buildCreateFeedbackInput = (): CreateFeedbackInput => {
    const { feedbackDraft } = useCommunityFeedbackStore.getState().snapshot;
    return {
      title: feedbackDraft.title,
      description: feedbackDraft.description,
      category: feedbackDraft.category,
      linkedItemId: feedbackDraft.linkedItemId || null,
      authorLabel: feedbackDraft.authorLabel
    };
  };

  resetFeedbackDraft = (): void => {
    this.patchFeedbackDraft(initialFeedbackDraft);
  };

  setCommentBody = (targetType: PortalTargetType, targetId: string, body: string): void => {
    this.patchCommentDraft(targetType, targetId, { body });
  };

  setCommentAuthorLabel = (targetType: PortalTargetType, targetId: string, authorLabel: string): void => {
    this.patchCommentDraft(targetType, targetId, { authorLabel });
  };

  buildCreateCommentInput = (targetType: PortalTargetType, targetId: string): CreateCommentInput => {
    const draft = this.getCommentDraft(targetType, targetId);
    return {
      body: draft.body,
      authorLabel: draft.authorLabel
    };
  };

  clearCommentDraft = (targetType: PortalTargetType, targetId: string): void => {
    const key = this.getCommentDraftKey(targetType, targetId);
    const { commentDrafts } = useCommunityFeedbackStore.getState().snapshot;
    const nextDrafts = { ...commentDrafts };
    delete nextDrafts[key];
    useCommunityFeedbackStore.getState().setSnapshot({ commentDrafts: nextDrafts });
  };

  getCommentDraft = (targetType: PortalTargetType, targetId: string): CommentDraft => {
    const key = this.getCommentDraftKey(targetType, targetId);
    return useCommunityFeedbackStore.getState().snapshot.commentDrafts[key] ?? DEFAULT_COMMENT_DRAFT;
  };

  prefillLinkedItem = (itemId: string): void => {
    this.patchFeedbackDraft({ linkedItemId: itemId });
  };

  private patchFeedbackDraft = (patch: Partial<typeof initialFeedbackDraft>): void => {
    const { feedbackDraft } = useCommunityFeedbackStore.getState().snapshot;
    useCommunityFeedbackStore.getState().setSnapshot({
      feedbackDraft: {
        ...feedbackDraft,
        ...patch
      }
    });
  };

  private patchCommentDraft = (targetType: PortalTargetType, targetId: string, patch: Partial<CommentDraft>): void => {
    const key = this.getCommentDraftKey(targetType, targetId);
    const { commentDrafts } = useCommunityFeedbackStore.getState().snapshot;
    useCommunityFeedbackStore.getState().setSnapshot({
      commentDrafts: {
        ...commentDrafts,
        [key]: {
          ...(commentDrafts[key] ?? DEFAULT_COMMENT_DRAFT),
          ...patch
        }
      }
    });
  };

  private getCommentDraftKey = (targetType: PortalTargetType, targetId: string): string => {
    return `${targetType}:${targetId}`;
  };
}
