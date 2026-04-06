import { useMemo } from 'react';
import type { AgentProfileView } from '@/api/types';
import { useChatThreadStore } from '@/components/chat/stores/chat-thread.store';
import { useAgents } from '@/hooks/agents/useAgents';

export type ResolvedAgentIdentity = {
  agentId: string;
  profile: AgentProfileView | null;
  displayName: string;
  avatarUrl: string | null;
};

function buildAgentProfileMap(
  scopedAgents: readonly AgentProfileView[],
  queryAgents: readonly AgentProfileView[],
): Map<string, AgentProfileView> {
  return new Map(
    [...queryAgents, ...scopedAgents]
      .filter((agent) => typeof agent.id === 'string' && agent.id.trim().length > 0)
      .map((agent) => [agent.id, agent]),
  );
}

export function useAgentIdentity(
  agentId?: string | null,
): ResolvedAgentIdentity | null {
  const normalizedAgentId = agentId?.trim() ?? '';
  const scopedAgents = useChatThreadStore(
    (state) => state.snapshot.availableAgents ?? [],
  );
  const agentsQuery = useAgents();

  const agentById = useMemo(
    () => buildAgentProfileMap(scopedAgents, agentsQuery.data?.agents ?? []),
    [agentsQuery.data?.agents, scopedAgents],
  );

  return useMemo(() => {
    if (!normalizedAgentId) {
      return null;
    }
    const profile = agentById.get(normalizedAgentId) ?? null;
    return {
      agentId: normalizedAgentId,
      profile,
      displayName: profile?.displayName?.trim() || normalizedAgentId,
      avatarUrl: profile?.avatarUrl?.trim() || null,
    };
  }, [agentById, normalizedAgentId]);
}
