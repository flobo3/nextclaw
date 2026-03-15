import type { SessionSummary } from "../lib/session";

type SessionCardProps = {
  session: SessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export function SessionCard({
  session,
  isActive,
  onSelect,
  onDelete,
}: SessionCardProps) {
  return (
    <div
      className={`session-card ${isActive ? "active" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="session-card-main">
        <span className="session-card-id">{session.sessionId}</span>
        <span className="session-card-meta">
          {session.messageCount} msgs · {session.status ?? "idle"}
        </span>
      </div>
      <button
        className="session-card-delete"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${session.sessionId}`}
      >
        ×
      </button>
    </div>
  );
}
