import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ChatSlashItem } from '@/components/chat/view-models/chat-ui.types';

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

  const onTextareaKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSlashPanelOpen && !event.nativeEvent.isComposing && (event.key === ' ' || event.code === 'Space')) {
      setDismissedSlashPanel(true);
    }
    if (isSlashPanelOpen && params.slashItems.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSlashIndex((current) => (current + 1) % params.slashItems.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSlashIndex((current) => (current - 1 + params.slashItems.length) % params.slashItems.length);
        return;
      }
      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        event.preventDefault();
        const selected = params.slashItems[activeSlashIndex];
        if (selected) {
          handleSelectSlashItem(selected);
        }
        return;
      }
    }
    if (event.key === 'Escape') {
      if (isSlashPanelOpen) {
        event.preventDefault();
        setDismissedSlashPanel(true);
        return;
      }
      if (params.isSending && params.canStopGeneration) {
        event.preventDefault();
        void params.onStop();
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void params.onSend();
    }
  }, [activeSlashIndex, handleSelectSlashItem, isSlashPanelOpen, params]);

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
