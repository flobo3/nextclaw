import { useRef, useState } from "react";
import { NcpHttpAgentClientEndpoint } from "@nextclaw/ncp-http-agent-client";
import { useNcpAgent } from "@nextclaw/ncp-react";
import { ChatHeader } from "../ui/chat-header";
import { ChatInput } from "../ui/chat-input";
import { ErrorBox } from "../ui/error-box";
import { MessageList } from "../ui/message-list";

type ChatPanelProps = {
  sessionId: string;
  onRefresh: () => void;
};

export function ChatPanel({ sessionId, onRefresh }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const ncpClientRef = useRef<NcpHttpAgentClientEndpoint>();
  if (!ncpClientRef.current) {
    ncpClientRef.current = new NcpHttpAgentClientEndpoint({
      baseUrl: window.location.origin,
    });
  }
  const agent = useNcpAgent(sessionId, ncpClientRef.current);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || agent.isSending || agent.isRunning) return;
    setDraft("");
    await agent.send(content);
    onRefresh();
  };

  const handleAbort = async () => {
    await agent.abort();
    onRefresh();
  };

  return (
    <main className="panel chat-panel">
      <ChatHeader
        title="NCP Agent Demo"
        streamRunDisabled={!agent.activeRunId}
        abortDisabled={!agent.isRunning}
        onStreamRun={agent.streamRun}
        onAbort={handleAbort}
      />
      <MessageList
        messages={agent.visibleMessages}
        emptyMessage="Send a message to start."
      />
      <ErrorBox error={agent.snapshot.error ?? null} />
      <ChatInput
        value={draft}
        placeholder="Ask anything. Demo will call get_current_time tool first."
        isSending={agent.isSending}
        sendDisabled={agent.isSending || agent.isRunning}
        isRunning={agent.isRunning}
        onChange={setDraft}
        onSend={handleSend}
        onAbort={handleAbort}
      />
    </main>
  );
}
