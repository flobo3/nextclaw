import type { SessionListItem } from "../types/session-list-item.js";

type SessionCardProps = {
  item: SessionListItem;
  onSelect: () => void;
  onDelete?: () => void;
};

export function SessionCard({ item, onSelect, onDelete }: SessionCardProps) {
  return (
    <div
      className={`session-card ${item.isActive ? "active" : ""}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        onSelect();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="session-card-main">
        <span className="session-card-id">{item.title}</span>
        {item.subtitle ? <span className="session-card-meta">{item.subtitle}</span> : null}
      </div>
      {onDelete ? (
        <button
          className="session-card-delete"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete ${item.title}`}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
