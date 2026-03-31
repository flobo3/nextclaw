import type { ChatMessageRole } from '../../view-models/chat-ui.types';
import { Bot, User, Wrench } from 'lucide-react';

export function ChatMessageAvatar({ role }: { role: ChatMessageRole }) {
  if (role === 'user') {
    return (
      <div
        data-testid="chat-message-avatar-user"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm"
      >
        <User className="h-4 w-4" />
      </div>
    );
  }
  if (role === 'tool') {
    return (
      <div
        data-testid="chat-message-avatar-tool"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm"
      >
        <Wrench className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div
      data-testid="chat-message-avatar-assistant"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gray-700 to-gray-950 text-white shadow-md ring-1 ring-inset ring-white/20"
    >
      <Bot className="h-[18px] w-[18px] text-white/95" strokeWidth={2.5} />
    </div>
  );
}
