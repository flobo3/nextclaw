import { create } from 'zustand';
import type { ChatComposerNode } from '@nextclaw/agent-chat-ui';
import type { MarketplaceInstalledRecord } from '@/api/types';
import type { ThinkingLevel } from '@/api/types';
import type { ChatModelOption } from '@/components/chat/chat-input.types';
import { createInitialChatComposerNodes } from '@/components/chat/chat-composer-state';

export type ChatInputSnapshot = {
  isProviderStateResolved: boolean;
  composerNodes: ChatComposerNode[];
  draft: string;
  pendingSessionType: string;
  defaultSessionType: string;
  canStopGeneration: boolean;
  stopDisabledReason: string | null;
  sendError: string | null;
  isSending: boolean;
  modelOptions: ChatModelOption[];
  selectedModel: string;
  selectedThinkingLevel: ThinkingLevel | null;
  sessionTypeOptions: Array<{ value: string; label: string }>;
  selectedSessionType?: string;
  stopSupported: boolean;
  stopReason?: string;
  canEditSessionType: boolean;
  sessionTypeUnavailable: boolean;
  skillRecords: MarketplaceInstalledRecord[];
  isSkillsLoading: boolean;
  selectedSkills: string[];
};

type ChatInputStore = {
  snapshot: ChatInputSnapshot;
  setSnapshot: (patch: Partial<ChatInputSnapshot>) => void;
};

const initialSnapshot: ChatInputSnapshot = {
  isProviderStateResolved: false,
  composerNodes: createInitialChatComposerNodes(),
  draft: '',
  pendingSessionType: 'native',
  defaultSessionType: 'native',
  canStopGeneration: false,
  stopDisabledReason: null,
  sendError: null,
  isSending: false,
  modelOptions: [],
  selectedModel: '',
  selectedThinkingLevel: null,
  sessionTypeOptions: [],
  selectedSessionType: undefined,
  stopSupported: false,
  stopReason: undefined,
  canEditSessionType: false,
  sessionTypeUnavailable: false,
  skillRecords: [],
  isSkillsLoading: false,
  selectedSkills: []
};

export const useChatInputStore = create<ChatInputStore>((set) => ({
  snapshot: initialSnapshot,
  setSnapshot: (patch) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        ...patch
      }
    }))
}));
