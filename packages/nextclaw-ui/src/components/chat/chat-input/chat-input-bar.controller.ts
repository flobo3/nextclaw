import { useCallback, useEffect, useState } from 'react';
import type { ChatSlashItem } from '@nextclaw/agent-chat-ui';
import type { KeyboardEvent } from 'react';

type UseChatInputBarControllerParams = {
  isSlashMode: boolean;
  slashItems: ChatSlashItem[];
  isSlashLoading: boolean;
  onSelectSlashItem: (item: ChatSlashItem) => void;
  onSend: () => Promise<void> | void;
  onStop: () => Promise<void> | void;
  isSending: boolean;
  canStopGeneration: boolean;
};

function isSubmitKey(event: Pick<KeyboardEvent<HTMLTextAreaElement>, 'key' | 'shiftKey'>): boolean {
  return event.key === 'Enter' && !event.shiftKey;
}

function isSlashDismissKey(event: Pick<KeyboardEvent<HTMLTextAreaElement>, 'key' | 'code' | 'nativeEvent'>): boolean {
  return !event.nativeEvent.isComposing && (event.key === ' ' || event.code === 'Space');
}

export function useChatInputBarController(params: UseChatInputBarControllerParams) {
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const [dismissedSlashPanel, setDismissedSlashPanel] = useState(false);

  const isSlashPanelOpen = params.isSlashMode && !dismissedSlashPanel;
  const activeSlashItem = params.slashItems[activeSlashIndex] ?? null;

  useEffect(() => {
    if (!isSlashPanelOpen || params.slashItems.length === 0) {
      setActiveSlashIndex(0);
      return;
    }
    setActiveSlashIndex((current) => {
      if (current < 0) {
        return 0;
      }
      if (current >= params.slashItems.length) {
        return params.slashItems.length - 1;
      }
      return current;
    });
  }, [isSlashPanelOpen, params.slashItems.length]);

  useEffect(() => {
    if (!params.isSlashMode && dismissedSlashPanel) {
      setDismissedSlashPanel(false);
    }
  }, [dismissedSlashPanel, params.isSlashMode]);

  const handleSelectSlashItem = useCallback((item: ChatSlashItem) => {
    params.onSelectSlashItem(item);
    setDismissedSlashPanel(false);
  }, [params]);

  const handleSlashKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!isSlashPanelOpen || params.slashItems.length === 0) {
      return false;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSlashIndex((current) => (current + 1) % params.slashItems.length);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSlashIndex((current) => (current - 1 + params.slashItems.length) % params.slashItems.length);
      return true;
    }
    if (!isSubmitKey(event) && event.key !== 'Tab') {
      return false;
    }
    event.preventDefault();
    const selected = params.slashItems[activeSlashIndex];
    if (selected) {
      handleSelectSlashItem(selected);
    }
    return true;
  }, [activeSlashIndex, handleSelectSlashItem, isSlashPanelOpen, params.slashItems]);

  const handleEscapeKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (event.key !== 'Escape') {
      return false;
    }
    if (isSlashPanelOpen) {
      event.preventDefault();
      setDismissedSlashPanel(true);
      return true;
    }
    if (!params.isSending || !params.canStopGeneration) {
      return false;
    }
    event.preventDefault();
    void params.onStop();
    return true;
  }, [isSlashPanelOpen, params]);

  const onTextareaKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSubmitKey(event) && params.isSending) {
      event.preventDefault();
      return;
    }
    if (isSlashPanelOpen && isSlashDismissKey(event)) {
      setDismissedSlashPanel(true);
    }
    if (handleSlashKeyDown(event)) {
      return;
    }
    if (handleEscapeKeyDown(event)) {
      return;
    }
    if (isSubmitKey(event)) {
      event.preventDefault();
      void params.onSend();
    }
  }, [handleEscapeKeyDown, handleSlashKeyDown, isSlashPanelOpen, params.isSending, params.onSend]);

  return {
    isSlashPanelOpen,
    activeSlashIndex,
    activeSlashItem,
    onSelectSlashItem: handleSelectSlashItem,
    onSlashPanelOpenChange: (open: boolean) => {
      if (!open) {
        setDismissedSlashPanel(true);
      }
    },
    onSetActiveSlashIndex: setActiveSlashIndex,
    onTextareaKeyDown
  };
}
