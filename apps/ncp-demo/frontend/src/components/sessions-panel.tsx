import {
  type SessionSummary,
  createNewSessionId,
  deleteSession,
} from "../lib/session";
import { SessionActions } from "../ui/session-actions";
import { SessionList } from "../ui/session-list";

type SessionsPanelProps = {
  sessionId: string;
  setSessionId: (id: string) => void;
  sessions: SessionSummary[];
  onRefresh: () => void;
};

export function SessionsPanel({
  sessionId,
  setSessionId,
  sessions,
  onRefresh,
}: SessionsPanelProps) {
  const handleSessionSelect = (id: string) => setSessionId(id);

  const handleNewSession = () => setSessionId(createNewSessionId());

  const handleSessionDelete = async (id: string) => {
    const ok = await deleteSession(id);
    if (!ok) return;
    if (sessionId === id) {
      const remaining = sessions.filter((s) => s.sessionId !== id);
      setSessionId(
        remaining.length > 0 ? remaining[0].sessionId : createNewSessionId(),
      );
    }
    onRefresh();
  };

  return (
    <aside className="panel sessions-panel">
      <div className="panel-title">Sessions</div>
      <SessionActions onNew={handleNewSession} onRefresh={onRefresh} />
      <div className="session-list">
        <SessionList
          sessions={sessions}
          activeSessionId={sessionId}
          onSelect={handleSessionSelect}
          onDelete={handleSessionDelete}
        />
      </div>
    </aside>
  );
}
