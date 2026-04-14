import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeedbackThread } from "@shared/public-roadmap-feedback-portal.types";
import { usePortalPresenter } from "../../../app/portal-presenter.service";
import { portalApiService, portalQueryKeys } from "../../../services/portal-api.service";
import { useCommunityFeedbackStore } from "../../../stores/community-feedback.store";
import {
  COMMUNITY_FEEDBACK_STATUS_LABELS,
  formatPortalDate,
  PUBLIC_ITEM_TYPE_LABELS,
  PUBLIC_PHASE_LABELS
} from "../../../shared/portal-format.utils";
import { CommentComposer } from "../../../shared/components/comment-composer";
import { TagChip } from "../../../shared/components/tag-chip";

type FeedbackThreadCardProps = {
  thread: FeedbackThread;
};

export function FeedbackThreadCard({ thread }: FeedbackThreadCardProps): JSX.Element {
  const presenter = usePortalPresenter();
  const queryClient = useQueryClient();
  const commentDrafts = useCommunityFeedbackStore((state) => state.snapshot.commentDrafts);
  const commentDraft = commentDrafts[`feedback:${thread.feedback.id}`] ?? {
    body: "",
    authorLabel: ""
  };

  const voteMutation = useMutation({
    mutationFn: async () => await portalApiService.createFeedbackVote(thread.feedback.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalQueryKeys.all() });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async () => await portalApiService.createFeedbackComment(
      thread.feedback.id,
      presenter.communityFeedbackManager.buildCreateCommentInput("feedback", thread.feedback.id)
    ),
    onSuccess: async () => {
      presenter.communityFeedbackManager.clearCommentDraft("feedback", thread.feedback.id);
      await queryClient.invalidateQueries({ queryKey: portalQueryKeys.all() });
    }
  });

  return (
    <article className="feedback-thread-card">
      <div className="feedback-thread-card__header">
        <div className="feedback-thread-card__chips">
          <TagChip tone="type">{PUBLIC_ITEM_TYPE_LABELS[thread.feedback.category]}</TagChip>
          <TagChip tone="phase">{COMMUNITY_FEEDBACK_STATUS_LABELS[thread.feedback.status]}</TagChip>
          {thread.feedback.linkedItem ? (
            <button
              type="button"
              className="feedback-thread-card__link"
              onClick={() => presenter.itemDetailManager.openItem(thread.feedback.linkedItem?.itemId ?? "")}
            >
              关联事项: {thread.feedback.linkedItem.itemTitle} · {PUBLIC_PHASE_LABELS[thread.feedback.linkedItem.itemPhase]}
            </button>
          ) : null}
        </div>
        <div className="feedback-thread-card__signals">
          <strong>{thread.feedback.engagement.voteCount}</strong>
          <span>支持</span>
        </div>
      </div>
      <h3>{thread.feedback.title}</h3>
      <p>{thread.feedback.description}</p>
      <div className="feedback-thread-card__meta">
        <span>{thread.feedback.authorLabel}</span>
        <span>{formatPortalDate(thread.feedback.updatedAt)}</span>
        <span>{thread.feedback.engagement.commentCount} 条评论</span>
      </div>
      <div className="feedback-thread-card__actions">
        <button type="button" onClick={() => void voteMutation.mutate()} disabled={voteMutation.isPending}>
          {voteMutation.isPending ? "提交中…" : "支持这个建议"}
        </button>
        {thread.feedback.linkedItem ? (
          <button
            type="button"
            onClick={() => presenter.itemDetailManager.openItem(thread.feedback.linkedItem?.itemId ?? "")}
          >
            查看关联事项
          </button>
        ) : null}
      </div>
      {thread.comments.length > 0 ? (
        <div className="feedback-thread-card__comments">
          {thread.comments.map((comment) => (
            <article key={comment.id} className="comment-card">
              <header>
                <strong>{comment.authorLabel}</strong>
                <span>{formatPortalDate(comment.createdAt)}</span>
              </header>
              <p>{comment.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-inline-state">还没有评论，你可以先补第一条。</div>
      )}
      <CommentComposer
        authorLabel={commentDraft.authorLabel}
        body={commentDraft.body}
        isPending={commentMutation.isPending}
        onAuthorLabelChange={(value) => presenter.communityFeedbackManager.setCommentAuthorLabel("feedback", thread.feedback.id, value)}
        onBodyChange={(value) => presenter.communityFeedbackManager.setCommentBody("feedback", thread.feedback.id, value)}
        onSubmit={() => void commentMutation.mutate()}
        submitLabel="回复这个建议"
      />
    </article>
  );
}
