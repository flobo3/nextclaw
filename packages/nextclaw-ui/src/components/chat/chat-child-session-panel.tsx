import { ArrowLeft, Loader2, X } from 'lucide-react';
import { ChatMessageListContainer } from '@/components/chat/containers/chat-message-list.container';
import { useNcpChildSessionTabsView } from '@/components/chat/ncp/session-conversation/use-ncp-child-session-tabs-view';
import { useNcpSessionConversation } from '@/components/chat/ncp/session-conversation/use-ncp-session-conversation';
import type { ChatChildSessionTab } from '@/components/chat/stores/chat-thread.store';
import { AgentIdentityAvatar } from '@/components/common/agent-identity';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ChatToolActionViewModel } from '@nextclaw/agent-chat-ui';

type ChatChildSessionPanelProps = {
  tabs: readonly ChatChildSessionTab[];
  activeSessionKey: string;
  onSelectSession: (sessionKey: string) => void;
  onClose: () => void;
  onBackToParent: () => void;
  onToolAction?: (action: ChatToolActionViewModel) => void;
};

function ChildSessionPanelConversation({
  sessionKey,
  onToolAction,
}: {
  sessionKey: string;
  onToolAction?: (action: ChatToolActionViewModel) => void;
}) {
  const agent = useNcpSessionConversation(sessionKey);
  const messages = agent.visibleMessages;

  if (agent.isHydrating) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('chatChildSessionLoading')}
      </div>
    );
  }

  if (agent.hydrateError) {
    return (
      <div className="px-4 py-5 text-sm text-rose-600">
        {agent.hydrateError.message}
      </div>
    );
  }

  if (messages.length === 0 && !agent.isRunning) {
    return (
      <div className="px-4 py-5 text-sm text-gray-500">
        {t('chatChildSessionEmpty')}
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <ChatMessageListContainer
        messages={messages}
        isSending={agent.isRunning}
        onToolAction={onToolAction}
      />
    </div>
  );
}

export function ChatChildSessionPanel({
  tabs,
  activeSessionKey,
  onSelectSession,
  onClose,
  onBackToParent,
  onToolAction,
}: ChatChildSessionPanelProps) {
  const resolvedTabs = useNcpChildSessionTabsView(tabs);
  const activeTab =
    resolvedTabs.find((tab) => tab.sessionKey === activeSessionKey) ??
    resolvedTabs[0] ??
    null;
  const hasParentSession = resolvedTabs.some((tab) => Boolean(tab.parentSessionKey));
  const shouldShowTabs = resolvedTabs.length > 1;

  if (!activeTab) {
    return null;
  }

  return (
    <aside className="hidden md:flex md:w-[24rem] lg:w-[28rem] shrink-0 border-l border-gray-200/70 bg-white/90 backdrop-blur-sm">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="border-b border-gray-200/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToParent}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900',
                !hasParentSession && 'pointer-events-none opacity-0',
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('chatBackToParent')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200/80 p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label={t('chatChildSessionClosePanel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!shouldShowTabs ? (
            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
              {activeTab.agentId ? (
                <AgentIdentityAvatar
                  agentId={activeTab.agentId}
                  className="h-5 w-5 shrink-0"
                />
              ) : null}
              <span className="truncate" title={activeTab.sessionKey}>
                {activeTab.title}
              </span>
            </div>
          ) : null}
          {shouldShowTabs ? (
            <div className="mt-3 overflow-x-auto custom-scrollbar">
              <Tabs value={activeSessionKey} onValueChange={onSelectSession}>
                <TabsList className="h-auto min-w-max justify-start gap-1.5 rounded-none bg-transparent p-0 text-gray-500">
                  {resolvedTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.sessionKey}
                      value={tab.sessionKey}
                      className="gap-2 rounded-full border border-gray-200/80 bg-white/85 px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-none hover:border-primary/30 hover:text-primary data-[state=active]:border-primary/30 data-[state=active]:bg-primary-50/70 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      {tab.agentId ? (
                        <AgentIdentityAvatar
                          agentId={tab.agentId}
                          className="h-4 w-4 shrink-0"
                        />
                      ) : null}
                      <span className="max-w-[132px] truncate">{tab.title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {resolvedTabs.map((tab) => (
            <div
              key={tab.sessionKey}
              className={cn(tab.sessionKey === activeSessionKey ? 'block' : 'hidden')}
            >
              <ChildSessionPanelConversation
                sessionKey={tab.sessionKey}
                onToolAction={onToolAction}
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
