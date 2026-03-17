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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200/80 bg-gray-900 text-white shadow-sm"
    >
      <Bot className="h-4 w-4" />
    </div>
  );
}
