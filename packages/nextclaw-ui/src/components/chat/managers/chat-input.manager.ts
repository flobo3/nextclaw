import type { ChatComposerNode } from '@nextclaw/agent-chat-ui';
import {
  createInitialChatComposerNodes,
  createChatComposerNodesFromDraft,
  deriveChatComposerDraft,
  deriveSelectedSkillsFromComposer,
  syncComposerSkills
} from '@/components/chat/chat-composer-state';
import { updateSession } from '@/api/config';
import { useChatInputStore } from '@/components/chat/stores/chat-input.store';
import { buildNewSessionKey } from '@/components/chat/chat-session-route';
import type { ChatUiManager } from '@/components/chat/managers/chat-ui.manager';
import { useChatSessionListStore } from '@/components/chat/stores/chat-session-list.store';
import { normalizeSessionType } from '@/components/chat/useChatSessionTypeState';
import type { ChatInputSnapshot } from '@/components/chat/stores/chat-input.store';
import { ChatSessionPreferenceSync } from '@/components/chat/chat-session-preference-sync';
import type { SetStateAction } from 'react';
import type { ChatStreamActionsManager } from '@/components/chat/managers/chat-stream-actions.manager';
import type { ThinkingLevel } from '@/api/types';
import type { ChatModelOption } from '@/components/chat/chat-input.types';

export class ChatInputManager {
  private readonly sessionPreferenceSync = new ChatSessionPreferenceSync(updateSession);

  constructor(
    private uiManager: ChatUiManager,
    private streamActionsManager: ChatStreamActionsManager
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

  private isSameStringArray = (left: string[], right: string[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

  private syncComposerSnapshot = (nodes: ChatComposerNode[]) => {
    useChatInputStore.getState().setSnapshot({
      composerNodes: nodes,
      draft: deriveChatComposerDraft(nodes),
      selectedSkills: deriveSelectedSkillsFromComposer(nodes)
    });
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
      const { selectedModel } = useChatInputStore.getState().snapshot;
      this.reconcileThinkingForModel(selectedModel);
    }
  };

  setDraft = (next: SetStateAction<string>) => {
    const prev = useChatInputStore.getState().snapshot.draft;
    const value = this.resolveUpdateValue(prev, next);
    if (value === prev) {
      return;
    }
    this.syncComposerSnapshot(createChatComposerNodesFromDraft(value));
  };

  setComposerNodes = (next: SetStateAction<ChatComposerNode[]>) => {
    const prev = useChatInputStore.getState().snapshot.composerNodes;
    const value = this.resolveUpdateValue(prev, next);
    if (Object.is(value, prev)) {
      return;
    }
    this.syncComposerSnapshot(value);
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
    const { selectedSkills: requestedSkills, composerNodes } = inputSnapshot;
    const hasSelectedSession = Boolean(sessionSnapshot.selectedSessionKey);
    const sessionKey = sessionSnapshot.selectedSessionKey ?? buildNewSessionKey(sessionSnapshot.selectedAgentId);
    if (!hasSelectedSession) {
      this.uiManager.goToSession(sessionKey, { replace: true });
    }
    this.setComposerNodes(createInitialChatComposerNodes());
    await this.streamActionsManager.sendMessage({
      message,
      sessionKey,
      agentId: sessionSnapshot.selectedAgentId,
      sessionType: inputSnapshot.selectedSessionType,
      model: inputSnapshot.selectedModel || undefined,
      thinkingLevel: inputSnapshot.selectedThinkingLevel ?? undefined,
      stopSupported: inputSnapshot.stopSupported,
      stopReason: inputSnapshot.stopReason,
      requestedSkills,
      restoreDraftOnError: true,
      composerNodes
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
    void this.syncRemoteSessionType(normalized);
  };

  setSelectedSkills = (next: SetStateAction<string[]>) => {
    const snapshot = useChatInputStore.getState().snapshot;
    const { selectedSkills: prev } = snapshot;
    const value = this.resolveUpdateValue(prev, next);
    if (this.isSameStringArray(value, prev)) {
      return;
    }
    this.syncComposerSnapshot(syncComposerSkills(snapshot.composerNodes, value, snapshot.skillRecords));
  };

  selectModel = (value: string) => {
    this.setSelectedModel(value);
    this.sessionPreferenceSync.syncSelectedSessionPreferences();
  };

  selectThinkingLevel = (value: ThinkingLevel) => {
    this.setSelectedThinkingLevel(value);
    this.sessionPreferenceSync.syncSelectedSessionPreferences();
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
    const { selectedThinkingLevel } = snapshot;
    const nextThinking = this.resolveThinkingForModel(modelOption, selectedThinkingLevel);
    if (nextThinking !== selectedThinkingLevel) {
      useChatInputStore.getState().setSnapshot({ selectedThinkingLevel: nextThinking });
    }
  }

  private syncRemoteSessionType = async (normalizedType: string) => {
    const sessionSnapshot = useChatSessionListStore.getState().snapshot;
    const { selectedSessionKey } = sessionSnapshot;
    if (!selectedSessionKey) {
      return;
    }
    const selectedSession = sessionSnapshot.sessions.find((session) => session.key === selectedSessionKey);
    if (!selectedSession?.sessionTypeMutable) {
      return;
    }
    if (normalizeSessionType(selectedSession.sessionType) === normalizedType) {
      return;
    }
    await updateSession(selectedSessionKey, { sessionType: normalizedType });
  };
}
