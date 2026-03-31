export type ChatComposerKeyboardAction =
  | { type: 'move-slash-index'; index: number }
  | { type: 'insert-active-slash-item' }
  | { type: 'close-slash' }
  | { type: 'stop-generation' }
  | { type: 'consume' }
  | { type: 'insert-line-break' }
  | { type: 'send-message' }
  | { type: 'delete-content'; direction: 'backward' | 'forward' }
  | { type: 'noop' };

export function resolveChatComposerKeyboardAction(params: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  isSlashMenuOpen: boolean;
  slashItemCount: number;
  activeSlashIndex: number;
  isSending: boolean;
  canStopGeneration: boolean;
}): ChatComposerKeyboardAction {
  const {
    key,
    shiftKey,
    isComposing,
    isSlashMenuOpen,
    slashItemCount,
    activeSlashIndex,
    isSending,
    canStopGeneration
  } = params;

  if (key === 'Enter' && !shiftKey && isSending) {
    return { type: 'consume' };
  }

  if (isSlashMenuOpen && slashItemCount > 0) {
    if (key === 'ArrowDown') {
      return {
        type: 'move-slash-index',
        index: (activeSlashIndex + 1) % slashItemCount
      };
    }
    if (key === 'ArrowUp') {
      return {
        type: 'move-slash-index',
        index: (activeSlashIndex - 1 + slashItemCount) % slashItemCount
      };
    }
    if ((key === 'Enter' && !shiftKey) || key === 'Tab') {
      return { type: 'insert-active-slash-item' };
    }
  }

  if (key === 'Escape') {
    if (isSlashMenuOpen) {
      return { type: 'close-slash' };
    }
    if (isSending && canStopGeneration) {
      return { type: 'stop-generation' };
    }
    return { type: 'noop' };
  }

  if (key === 'Enter' && shiftKey) {
    return { type: 'insert-line-break' };
  }

  if (key === 'Enter') {
    return { type: 'send-message' };
  }

  if (!isComposing && (key === 'Backspace' || key === 'Delete')) {
    return {
      type: 'delete-content',
      direction: key === 'Backspace' ? 'backward' : 'forward'
    };
  }

  return { type: 'noop' };
}
