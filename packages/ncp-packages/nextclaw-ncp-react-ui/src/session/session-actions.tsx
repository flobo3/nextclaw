type SessionActionsProps = {
  onNew: () => void;
  onRefresh: () => void;
};

export function SessionActions({ onNew, onRefresh }: SessionActionsProps) {
  return (
    <div className="session-actions">
      <button className="ncp-ui-button ncp-ui-button-ghost" type="button" onClick={onNew}>
        new
      </button>
      <button className="ncp-ui-button ncp-ui-button-ghost" type="button" onClick={onRefresh}>
        refresh
      </button>
    </div>
  );
}
