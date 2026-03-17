import type { SetStateAction } from 'react';
import type { ThinkingLevel } from '@/api/types';
import { useChatInputStore } from '@/components/chat/stores/chat-input.store';
import { useChatSessionListStore } from '@/components/chat/stores/chat-session-list.store';
import type { ChatInputSnapshot } from '@/components/chat/stores/chat-input.store';
import type { ChatStreamActionsManager } from '@/components/chat/managers/chat-stream-actions.manager';
import type { ChatUiManager } from '@/components/chat/managers/chat-ui.manager';
import type { ChatModelOption } from '@/components/chat/chat-input.types';
import { normalizeSessionType } from '@/components/chat/useChatSessionTypeState';

export class NcpChatInputManager {
  constructor(
    private uiManager: ChatUiManager,
    private streamActionsManager: ChatStreamActionsManager,
    private getDraftSessionId: () => string
  ) {}

  private hasSnapshotChanges = (patch: Partial<ChatInputSnapshot>): boolean => {
    const current = useChatInputStore.getState().snapshot;
    for (const [key, value] of Object.entries(patch) as Array<[keyof ChatInputSnapshot, ChatInputSnapshot[keyof ChatInputSnapshot]]>) {
      if (!Object.is(current[key], value)) {
        return true;
      }
    }
    return false;
  };

  private resolveUpdateValue = <T>(prev: T, next: SetStateAction<T>): T => {
    if (typeof next === 'function') {
      return (next as (value: T) => T)(prev);
    }
    return next;
  };

  syncSnapshot = (patch: Partial<ChatInputSnapshot>) => {
    if (!this.hasSnapshotChanges(patch)) {
      return;
    }
    useChatInputStore.getState().setSnapshot(patch);
    if (
      Object.prototype.hasOwnProperty.call(patch, 'modelOptions') ||
      Object.prototype.hasOwnProperty.call(patch, 'selectedModel') ||
      Object.prototype.hasOwnProperty.call(patch, 'selectedThinkingLevel')
    ) {
      const snapshot = useChatInputStore.getState().snapshot;
      this.reconcileThinkingForModel(snapshot.selectedModel);
    }
  };

  setDraft = (next: SetStateAction<string>) => {
    const prev = useChatInputStore.getState().snapshot.draft;
    const value = this.resolveUpdateValue(prev, next);
    if (value === prev) {
      return;
    }
    useChatInputStore.getState().setSnapshot({ draft: value });
  };

  setPendingSessionType = (next: SetStateAction<string>) => {
    const prev = useChatInputStore.getState().snapshot.pendingSessionType;
    const value = this.resolveUpdateValue(prev, next);
    if (value === prev) {
      return;
    }
    useChatInputStore.getState().setSnapshot({ pendingSessionType: value });
  };

  send = async () => {
    const inputSnapshot = useChatInputStore.getState().snapshot;
    const sessionSnapshot = useChatSessionListStore.getState().snapshot;
    const message = inputSnapshot.draft.trim();
    if (!message) {
      return;
    }
    const requestedSkills = inputSnapshot.selectedSkills;
    const sessionKey = sessionSnapshot.selectedSessionKey ?? this.getDraftSessionId();
    if (!sessionSnapshot.selectedSessionKey) {
      this.uiManager.goToSession(sessionKey, { replace: true });
    }
    this.setDraft('');
    this.setSelectedSkills([]);
    await this.streamActionsManager.sendMessage({
      message,
      sessionKey,
      agentId: sessionSnapshot.selectedAgentId,
      sessionType: inputSnapshot.selectedSessionType,
      model: inputSnapshot.selectedModel || undefined,
      thinkingLevel: inputSnapshot.selectedThinkingLevel ?? undefined,
      stopSupported: true,
      requestedSkills,
      restoreDraftOnError: true
    });
  };

  stop = async () => {
    await this.streamActionsManager.stopCurrentRun();
  };

  goToProviders = () => {
    this.uiManager.goToProviders();
  };

  setSelectedModel = (next: SetStateAction<string>) => {
    const prev = useChatInputStore.getState().snapshot.selectedModel;
    const value = this.resolveUpdateValue(prev, next);
    if (value === prev) {
      return;
    }
    useChatInputStore.getState().setSnapshot({ selectedModel: value });
    this.reconcileThinkingForModel(value);
  };

  setSelectedThinkingLevel = (next: SetStateAction<ThinkingLevel | null>) => {
    const prev = useChatInputStore.getState().snapshot.selectedThinkingLevel;
    const value = this.resolveUpdateValue(prev, next);
    if (value === prev) {
      return;
    }
    useChatInputStore.getState().setSnapshot({ selectedThinkingLevel: value });
  };

  selectSessionType = (value: string) => {
    const normalized = normalizeSessionType(value);
    useChatInputStore.getState().setSnapshot({ selectedSessionType: normalized, pendingSessionType: normalized });
  };

  setSelectedSkills = (next: SetStateAction<string[]>) => {
    const prev = useChatInputStore.getState().snapshot.selectedSkills;
    const value = this.resolveUpdateValue(prev, next);
    if (Object.is(value, prev)) {
      return;
    }
    useChatInputStore.getState().setSnapshot({ selectedSkills: value });
  };

  selectModel = (value: string) => {
    this.setSelectedModel(value);
  };

  selectThinkingLevel = (value: ThinkingLevel) => {
    this.setSelectedThinkingLevel(value);
  };

  selectSkills = (next: string[]) => {
    this.setSelectedSkills(next);
  };

  private resolveThinkingForModel(modelOption: ChatModelOption | undefined, current: ThinkingLevel | null): ThinkingLevel | null {
    const capability = modelOption?.thinkingCapability;
    if (!capability || capability.supported.length === 0) {
      return null;
    }
    if (current === 'off') {
      return 'off';
    }
    if (current && capability.supported.includes(current)) {
      return current;
    }
    if (capability.default && capability.supported.includes(capability.default)) {
      return capability.default;
    }
    return 'off';
  }

  private reconcileThinkingForModel(model: string): void {
    const snapshot = useChatInputStore.getState().snapshot;
    const modelOption = snapshot.modelOptions.find((option) => option.value === model);
    const nextThinking = this.resolveThinkingForModel(modelOption, snapshot.selectedThinkingLevel);
    if (nextThinking !== snapshot.selectedThinkingLevel) {
      useChatInputStore.getState().setSnapshot({ selectedThinkingLevel: nextThinking });
    }
  }
}
