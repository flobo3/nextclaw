import type { SessionSummary } from "../lib/session";
import { SessionCard } from "./session-card";

type SessionListProps = {
  sessions: SessionSummary[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
};

export function SessionList({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="muted">No sessions yet. Send a message to create one.</p>
    );
  }
  return (
    <>
      {sessions.map((session) => (
        <SessionCard
          key={session.sessionId}
          session={session}
          isActive={session.sessionId === activeSessionId}
          onSelect={() => onSelect(session.sessionId)}
          onDelete={() => onDelete(session.sessionId)}
        />
      ))}
    </>
  );
}
