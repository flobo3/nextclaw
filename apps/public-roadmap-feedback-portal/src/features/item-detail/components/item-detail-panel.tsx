import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublicItemDetail } from "@shared/public-roadmap-feedback-portal.types";
import { usePortalPresenter } from "../../../app/portal-presenter.service";
import { CommentComposer } from "../../../shared/components/comment-composer";
import { TagChip } from "../../../shared/components/tag-chip";
import {
  COMMUNITY_FEEDBACK_STATUS_LABELS,
  formatPortalDate,
  PUBLIC_ITEM_TYPE_LABELS,
  PUBLIC_PHASE_LABELS
} from "../../../shared/portal-format.utils";
import { portalApiService, portalQueryKeys } from "../../../services/portal-api.service";
import { useCommunityFeedbackStore } from "../../../stores/community-feedback.store";

type ItemDetailPanelProps = {
  data: PublicItemDetail | undefined;
  isOpen: boolean;
  isPending: boolean;
};

export function ItemDetailPanel({ data, isOpen, isPending }: ItemDetailPanelProps): JSX.Element | null {
  const presenter = usePortalPresenter();
  const queryClient = useQueryClient();
  const activeItemId = data?.item.id ?? "";
  const commentDrafts = useCommunityFeedbackStore((state) => state.snapshot.commentDrafts);
  const commentDraft = commentDrafts[`item:${activeItemId}`] ?? {
    body: "",
    authorLabel: ""
  };

  const voteMutation = useMutation({
    mutationFn: async () => await portalApiService.createItemVote(activeItemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalQueryKeys.all() });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async () => await portalApiService.createItemComment(
      activeItemId,
      presenter.communityFeedbackManager.buildCreateCommentInput("item", activeItemId)
    ),
    onSuccess: async () => {
      presenter.communityFeedbackManager.clearCommentDraft("item", activeItemId);
      await queryClient.invalidateQueries({ queryKey: portalQueryKeys.all() });
    }
  });

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="detail-panel" aria-label="路线图事项详情">
      <div className="detail-panel__scrim" onClick={() => presenter.itemDetailManager.closeItem()} />
      <section className="detail-panel__card">
        <button
          type="button"
          className="detail-panel__close"
          onClick={() => presenter.itemDetailManager.closeItem()}
        >
          关闭
        </button>
        {isPending ? (
          <div className="loading-block">正在加载事项详情…</div>
        ) : null}
        {data ? (
          <>
            <p className="eyebrow">路线图事项详情</p>
            <div className="detail-panel__chips">
              <TagChip tone="phase">{PUBLIC_PHASE_LABELS[data.item.publicPhase]}</TagChip>
              <TagChip tone="type">{PUBLIC_ITEM_TYPE_LABELS[data.item.type]}</TagChip>
              <TagChip tone="source">{data.item.sourceMetadata.sourceStatus}</TagChip>
            </div>
            <h2>{data.item.title}</h2>
            <p className="detail-panel__summary">{data.item.summary}</p>
            <p>{data.item.description}</p>
            <dl className="detail-panel__meta">
              <div>
                <dt>最近更新</dt>
                <dd>{formatPortalDate(data.item.updatedAt)}</dd>
              </div>
              <div>
                <dt>反馈信号</dt>
                <dd>
                  {data.item.engagement.voteCount} 支持 · {data.item.engagement.commentCount} 评论 · {data.item.engagement.linkedFeedbackCount} 个关联建议
                </dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{data.item.sourceMetadata.sourceLabel}</dd>
              </div>
            </dl>
            <div className="detail-panel__primary-actions">
              <button type="button" onClick={() => void voteMutation.mutate()} disabled={voteMutation.isPending}>
                {voteMutation.isPending ? "提交中…" : "支持这个事项"}
              </button>
              <button
                type="button"
                onClick={() => presenter.communityFeedbackManager.prefillLinkedItem(data.item.id)}
              >
                用这个事项预填建议表单
              </button>
            </div>
            {data.comments.length > 0 ? (
              <div className="detail-panel__comments">
                <h3>事项评论</h3>
                {data.comments.map((comment) => (
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
              <div className="empty-inline-state">这个事项还没有评论。</div>
            )}
            <CommentComposer
              authorLabel={commentDraft.authorLabel}
              body={commentDraft.body}
              isPending={commentMutation.isPending}
              onAuthorLabelChange={(value) => presenter.communityFeedbackManager.setCommentAuthorLabel("item", activeItemId, value)}
              onBodyChange={(value) => presenter.communityFeedbackManager.setCommentBody("item", activeItemId, value)}
              onSubmit={() => void commentMutation.mutate()}
              submitLabel="评论这个事项"
            />
            {data.linkedFeedback.length > 0 ? (
              <div className="detail-panel__linked-feedback">
                <h3>关联建议</h3>
                {data.linkedFeedback.map((thread) => (
                  <article key={thread.feedback.id} className="linked-feedback-card">
                    <div className="linked-feedback-card__header">
                      <div className="detail-panel__chips">
                        <TagChip tone="type">{PUBLIC_ITEM_TYPE_LABELS[thread.feedback.category]}</TagChip>
                        <TagChip tone="phase">{COMMUNITY_FEEDBACK_STATUS_LABELS[thread.feedback.status]}</TagChip>
                      </div>
                      <strong>{thread.feedback.engagement.voteCount} 支持</strong>
                    </div>
                    <h4>{thread.feedback.title}</h4>
                    <p>{thread.feedback.description}</p>
                  </article>
                ))}
              </div>
            ) : null}
            {data.relatedItems.length > 0 ? (
              <div className="detail-panel__related">
                <h3>相关事项</h3>
                {data.relatedItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => presenter.itemDetailManager.openItem(item.id)}>
                    {item.title}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </aside>
  );
}
