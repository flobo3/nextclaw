type CommentComposerProps = {
  authorLabel: string;
  body: string;
  isPending: boolean;
  onAuthorLabelChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
};

export function CommentComposer(props: CommentComposerProps): JSX.Element {
  return (
    <div className="comment-composer">
      <label>
        称呼
        <input
          value={props.authorLabel}
          onChange={(event) => props.onAuthorLabelChange(event.target.value)}
          placeholder="匿名用户"
        />
      </label>
      <label>
        评论
        <textarea
          value={props.body}
          onChange={(event) => props.onBodyChange(event.target.value)}
          rows={3}
          placeholder="写下你对这个事项或建议的看法…"
        />
      </label>
      <button type="button" onClick={props.onSubmit} disabled={props.isPending}>
        {props.isPending ? "提交中…" : props.submitLabel}
      </button>
    </div>
  );
}
