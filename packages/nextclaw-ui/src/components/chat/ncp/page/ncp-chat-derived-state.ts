import { useEffect, useMemo, type MutableRefObject } from 'react';
import type {
  AgentProfileView,
  NcpSessionSummaryView,
  SessionEntryView,
  SessionSkillEntryView
} from '@/api/types';
import { sessionDisplayName } from '@/components/chat/chat-session-display';
import { adaptNcpSessionSummary } from '@/components/chat/ncp/ncp-session-adapter';
import type { NcpChatPresenter } from '@/components/chat/ncp/ncp-chat.presenter';
import type { UseHydratedNcpAgentResult } from '@nextclaw/ncp-react';
import type { ChatModelOption } from '@/components/chat/chat-input.types';
import { resolveSessionTypeLabel } from '@/components/chat/useChatSessionTypeState';
export function useNcpChatDerivedState(params: {
  selectedSession: SessionEntryView | null;
  selectedAgentId: string;
  availableAgents: AgentProfileView[];
  parentSessionId: string | null;
  sessionSummaries: NcpSessionSummaryView[];
  selectedSessionType: string;
  sessionTypeOptions: Array<{ value: string; label: string }>;
}) {
  const currentSessionDisplayName = params.selectedSession
    ? sessionDisplayName(params.selectedSession)
    : undefined;
  const currentAgentId = params.selectedSession?.agentId ?? params.selectedAgentId;
  const currentAgent =
    params.availableAgents.find((agent) => agent.id === currentAgentId) ?? null;
  const parentSession = useMemo(() => {
    if (!params.parentSessionId) {
      return null;
    }
    const parentSummary =
      params.sessionSummaries.find(
        (summary) => summary.sessionId === params.parentSessionId,
      ) ?? null;
    return parentSummary ? adaptNcpSessionSummary(parentSummary) : null;
  }, [params.parentSessionId, params.sessionSummaries]);
  const currentSessionTypeLabel =
    params.sessionTypeOptions.find((option) => option.value === params.selectedSessionType)
      ?.label ?? resolveSessionTypeLabel(params.selectedSessionType);

  return {
    currentSessionDisplayName,
    currentAgentId,
    currentAgent,
    parentSession,
    currentSessionTypeLabel
  };
}

export function useNcpChatSnapshotSync(params: {
  presenter: NcpChatPresenter;
  isProviderStateResolved: boolean;
  defaultSessionType: string;
  canStopCurrentRun: boolean;
  stopDisabledReason: string | null;
  lastSendError: string | null;
  isSending: boolean;
  modelOptions: ChatModelOption[];
  sessionTypeOptions: Array<{ value: string; label: string }>;
  selectedSessionType: string;
  canEditSessionType: boolean;
  sessionTypeUnavailable: boolean;
  skillRecords: SessionSkillEntryView[];
  isSkillsLoading: boolean;
  sessionTypeUnavailableMessage: string | null;
  currentSessionTypeLabel: string;
  sessionKey: string;
  currentAgentId: string;
  currentAgent: AgentProfileView | null;
  availableAgents: AgentProfileView[];
  currentSessionDisplayName?: string;
  effectiveSessionProjectRoot: string | null;
  effectiveSessionProjectName: string | null;
  selectedSession: SessionEntryView | null;
  threadRef: MutableRefObject<HTMLDivElement | null>;
  agent: Pick<UseHydratedNcpAgentResult, 'isHydrating' | 'visibleMessages'>;
  isAwaitingAssistantOutput: boolean;
  parentSession: SessionEntryView | null;
}) {
  useEffect(() => {
    params.presenter.chatInputManager.syncSnapshot({
      isProviderStateResolved: params.isProviderStateResolved,
      defaultSessionType: params.defaultSessionType,
      canStopGeneration: params.canStopCurrentRun,
      stopDisabledReason: params.stopDisabledReason,
      stopSupported: true,
      stopReason: undefined,
      sendError: params.lastSendError,
      isSending: params.isSending,
      modelOptions: params.modelOptions,
      sessionTypeOptions: params.sessionTypeOptions,
      selectedSessionType: params.selectedSessionType,
      canEditSessionType: params.canEditSessionType,
      sessionTypeUnavailable: params.sessionTypeUnavailable,
      skillRecords: params.skillRecords,
      isSkillsLoading: params.isSkillsLoading,
    });
    params.presenter.chatThreadManager.syncSnapshot({
      isProviderStateResolved: params.isProviderStateResolved,
      modelOptions: params.modelOptions,
      sessionTypeUnavailable: params.sessionTypeUnavailable,
      sessionTypeUnavailableMessage: params.sessionTypeUnavailableMessage,
      sessionTypeLabel: params.currentSessionTypeLabel,
      sessionKey: params.sessionKey,
      agentId: params.currentAgentId,
      agentDisplayName: params.currentAgent?.displayName ?? null,
      agentAvatarUrl: params.currentAgent?.avatarUrl ?? null,
      availableAgents: params.availableAgents,
      sessionDisplayName: params.currentSessionDisplayName,
      sessionProjectRoot: params.effectiveSessionProjectRoot,
      sessionProjectName: params.effectiveSessionProjectName,
      canDeleteSession: Boolean(params.selectedSession),
      threadRef: params.threadRef,
      isHistoryLoading: params.agent.isHydrating,
      messages: params.agent.visibleMessages,
      isSending: params.isSending,
      isAwaitingAssistantOutput: params.isAwaitingAssistantOutput,
      parentSessionKey: params.parentSession?.key ?? null,
      parentSessionLabel: params.parentSession
        ? sessionDisplayName(params.parentSession)
        : null,
    });
  }, [
    params
  ]);
}
