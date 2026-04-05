import type { AgentProfileView } from '@/api/types';
import { AgentAvatar } from '@/components/common/AgentAvatar';
import { t } from '@/lib/i18n';
import { Bot, BrainCircuit, AlarmClock, MessageCircle } from 'lucide-react';

type ChatWelcomeProps = {
  onCreateSession: () => void;
  agents: AgentProfileView[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
};

const capabilities = [
  {
    icon: MessageCircle,
    titleKey: 'chatWelcomeCapability1Title' as const,
    descKey: 'chatWelcomeCapability1Desc' as const,
  },
  {
    icon: BrainCircuit,
    titleKey: 'chatWelcomeCapability2Title' as const,
    descKey: 'chatWelcomeCapability2Desc' as const,
  },
  {
    icon: AlarmClock,
    titleKey: 'chatWelcomeCapability3Title' as const,
    descKey: 'chatWelcomeCapability3Desc' as const,
  },
];

export function ChatWelcome({ onCreateSession, agents, selectedAgentId, onSelectAgent }: ChatWelcomeProps) {
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? null;

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        {/* Bot avatar */}
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bot className="h-8 w-8 text-primary" />
        </div>

        {/* Greeting */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('chatWelcomeTitle')}</h2>
        <p className="text-sm text-gray-500 mb-8">{t('chatWelcomeSubtitle')}</p>

        <div className="mb-8 rounded-2xl border border-gray-200 bg-white/90 p-4 text-left shadow-card">
          <div className="text-sm font-semibold text-gray-900">{t('chatDraftAgentTitle')}</div>
          <p className="mt-1 text-xs text-gray-500">{t('chatDraftAgentDescription')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {agents.map((agent) => {
              const active = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectAgent(agent.id)}
                  className={[
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  ].join(' ')}
                >
                  <AgentAvatar
                    agentId={agent.id}
                    displayName={agent.displayName}
                    avatarUrl={agent.avatarUrl}
                    className="h-6 w-6"
                  />
                  <span className="text-xs font-medium">
                    {agent.displayName?.trim() || agent.id}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedAgent ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <span>{t('chatDraftAgentCurrent')}:</span>
              <span className="font-medium text-gray-700">{selectedAgent.displayName?.trim() || selectedAgent.id}</span>
            </div>
          ) : null}
        </div>

        {/* Capability cards */}
        <div className="grid grid-cols-3 gap-3">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <button
                key={cap.titleKey}
                onClick={onCreateSession}
                className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
              >
                <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">{t(cap.titleKey)}</div>
                <div className="text-[11px] text-gray-500 leading-relaxed">{t(cap.descKey)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
