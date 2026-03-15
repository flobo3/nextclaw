import { useMemo, useRef, useState } from "react";
import { NcpHttpAgentClientEndpoint } from "@nextclaw/ncp-http-agent-client";
import { useNcpAgent } from "@nextclaw/ncp-react";
import { getOrCreateSessionId } from "./lib/session";
import { useSessions } from "./hooks/use-sessions";
import { SessionsPanel } from "./components/sessions-panel";
import { ChatPanel } from "./components/chat-panel";

export function App() {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const [draft, setDraft] = useState("");

  const ncpClientRef = useRef<NcpHttpAgentClientEndpoint>();
  if (!ncpClientRef.current) {
    ncpClientRef.current = new NcpHttpAgentClientEndpoint({
      baseUrl: window.location.origin,
    });
  }
  const ncpClient = ncpClientRef.current;

  const sessions = useSessions();
  const agent = useNcpAgent(sessionId, ncpClient);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || agent.isSending || agent.isRunning) return;
    await agent.send(content);
    setDraft("");
    sessions.refresh();
  };

  const handleAbort = async () => {
    await agent.abort();
    sessions.refresh();
  };

  return (
    <div className="demo-shell">
      <SessionsPanel
        sessionId={sessionId}
        sessions={sessions.sessions}
        onRefresh={sessions.refresh}
      />
      <ChatPanel
        visibleMessages={agent.visibleMessages}
        error={agent.snapshot.error ?? null}
        draft={draft}
        isSending={agent.isSending}
        activeRunId={agent.activeRunId}
        isRunning={agent.isRunning}
        onDraftChange={setDraft}
        onSend={handleSend}
        onAbort={handleAbort}
        onStreamRun={agent.streamRun}
      />
    </div>
  );
}
