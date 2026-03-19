import { resolveChatComposerKeyboardAction } from './chat-composer-keyboard.utils';

describe('chat composer keyboard utils', () => {
  it('moves the slash menu selection with arrow keys', () => {
    expect(
      resolveChatComposerKeyboardAction({
        key: 'ArrowDown',
        shiftKey: false,
        isComposing: false,
        isSlashMenuOpen: true,
        slashItemCount: 3,
        activeSlashIndex: 1,
        isSending: false,
        canStopGeneration: false
      })
    ).toEqual({
      type: 'move-slash-index',
      index: 2
    });
  });

  it('deletes composer content when backspace is pressed outside IME composition', () => {
    expect(
      resolveChatComposerKeyboardAction({
        key: 'Backspace',
        shiftKey: false,
        isComposing: false,
        isSlashMenuOpen: false,
        slashItemCount: 0,
        activeSlashIndex: 0,
        isSending: false,
        canStopGeneration: false
      })
    ).toEqual({
      type: 'delete-content',
      direction: 'backward'
    });
  });
});
