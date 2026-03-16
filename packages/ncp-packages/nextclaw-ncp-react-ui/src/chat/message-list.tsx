import type { NcpMessage } from "@nextclaw/ncp";
import { MessageBubble } from "./message-bubble.js";

type MessageListProps = {
  messages: readonly NcpMessage[];
  emptyMessage?: string;
};

export function MessageList({
  messages,
  emptyMessage = "Send a message to start.",
}: MessageListProps) {
  return (
    <section className="messages">
      {messages.length === 0 ? <p className="ncp-ui-muted">{emptyMessage}</p> : null}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </section>
  );
}
