import {
  type SessionSummary,
  createNewSessionId,
  deleteSession,
} from "../lib/session";
import {
  SessionActions,
  SessionList,
  type SessionListItem,
} from "@nextclaw/ncp-react-ui";

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
  const items: SessionListItem[] = sessions.map((session) => ({
    id: session.sessionId,
    title: session.sessionId,
    subtitle: `${session.messageCount} msgs · ${session.status ?? "idle"}`,
    isActive: session.sessionId === sessionId,
  }));

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
      <div className="session-list-shell">
        <SessionList
          items={items}
          onSelect={handleSessionSelect}
          onDelete={handleSessionDelete}
        />
      </div>
    </aside>
  );
}
