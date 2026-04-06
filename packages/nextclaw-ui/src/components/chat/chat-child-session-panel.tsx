import { ArrowLeft, Loader2, X } from 'lucide-react';
import { ChatMessageListContainer } from '@/components/chat/containers/chat-message-list.container';
import { useNcpSessionConversation } from '@/components/chat/ncp/session-conversation/use-ncp-session-conversation';
import { useChatThreadStore } from '@/components/chat/stores/chat-thread.store';
import { cn } from '@/lib/utils';
import type { ChatToolActionViewModel } from '@nextclaw/agent-chat-ui';

type ChatChildSessionPanelProps = {
  sessionKey: string;
  title?: string | null;
  onClose: () => void;
  onBackToParent: () => void;
  onToolAction?: (action: ChatToolActionViewModel) => void;
};

export function ChatChildSessionPanel({
  sessionKey,
  title,
  onClose,
  onBackToParent,
  onToolAction,
}: ChatChildSessionPanelProps) {
  const detailParentSessionKey = useChatThreadStore(
    (state) => state.snapshot.childSessionDetailParentSessionKey,
  );
  const agent = useNcpSessionConversation(sessionKey);
  const messages = agent.visibleMessages;
  const headerTitle = title?.trim() || sessionKey;

  return (
    <aside className="hidden md:flex md:w-[24rem] lg:w-[28rem] shrink-0 border-l border-gray-200/70 bg-white/90 backdrop-blur-sm">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="border-b border-gray-200/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToParent}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900',
                !detailParentSessionKey && 'pointer-events-none opacity-0',
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to parent</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close child session panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
              Child Session
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {headerTitle}
            </div>
            <div className="mt-1 text-[11px] text-gray-500">{sessionKey}</div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {agent.isHydrating ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading child session
            </div>
          ) : agent.hydrateError ? (
            <div className="px-4 py-5 text-sm text-rose-600">
              {agent.hydrateError.message}
            </div>
          ) : messages.length === 0 && !agent.isRunning ? (
            <div className="px-4 py-5 text-sm text-gray-500">
              No child session messages yet.
            </div>
          ) : (
            <div className="px-4 py-5">
              <ChatMessageListContainer
                messages={messages}
                isSending={agent.isRunning}
                onToolAction={onToolAction}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
