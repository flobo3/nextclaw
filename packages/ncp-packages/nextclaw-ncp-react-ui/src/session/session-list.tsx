import type { SessionListItem } from "../types/session-list-item.js";
import { SessionCard } from "./session-card.js";

type SessionListProps = {
  items: readonly SessionListItem[];
  emptyMessage?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function SessionList({
  items,
  emptyMessage = "No sessions yet. Send a message to create one.",
  onSelect,
  onDelete,
}: SessionListProps) {
  if (items.length === 0) {
    return <p className="ncp-ui-muted">{emptyMessage}</p>;
  }

  return (
    <div className="session-list">
      {items.map((item) => (
        <SessionCard
          key={item.id}
          item={item}
          onSelect={() => onSelect(item.id)}
          onDelete={onDelete ? () => onDelete(item.id) : undefined}
        />
      ))}
    </div>
  );
}
