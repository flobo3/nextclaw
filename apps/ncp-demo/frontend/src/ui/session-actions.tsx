type SessionActionsProps = {
  onNew: () => void;
  onRefresh: () => void;
};

export function SessionActions({ onNew, onRefresh }: SessionActionsProps) {
  return (
    <div className="session-actions">
      <button className="ghost" onClick={onNew}>
        new
      </button>
      <button className="ghost" onClick={onRefresh}>
        refresh
      </button>
    </div>
  );
}
