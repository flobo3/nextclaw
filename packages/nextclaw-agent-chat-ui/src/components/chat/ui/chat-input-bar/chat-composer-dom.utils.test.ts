import { readComposerSelection } from './chat-composer-dom.utils';
import { createChatComposerTextNode } from './chat-composer.utils';

describe('chat composer dom utils', () => {
  it('reads the caret offset from a raw text node inserted directly under the contenteditable root', () => {
    const root = document.createElement('div');
    const textNode = document.createTextNode('/');
    root.appendChild(textNode);
    document.body.appendChild(root);

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 1);
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(readComposerSelection(root, [createChatComposerTextNode('/')])).toEqual({
      start: 1,
      end: 1
    });

    document.body.removeChild(root);
  });
});
