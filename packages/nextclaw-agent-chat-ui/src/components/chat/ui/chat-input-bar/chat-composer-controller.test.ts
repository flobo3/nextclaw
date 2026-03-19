import { ChatComposerController } from './chat-composer-controller';
import { createChatComposerTextNode, createChatComposerTokenNode } from './chat-composer.utils';

describe('ChatComposerController', () => {
  it('preserves an existing skill token when typing after it', () => {
    const controller = new ChatComposerController();
    controller.sync(
      [createChatComposerTokenNode({ tokenKind: 'skill', tokenKey: 'web-search', label: 'Web Search' })],
      { start: 1, end: 1 }
    );

    const snapshot = controller.insertText(' hello');

    expect(snapshot.nodes).toEqual([
      expect.objectContaining({ type: 'token', tokenKey: 'web-search' }),
      expect.objectContaining({ type: 'text', text: ' hello' })
    ]);
    expect(snapshot.selectedSkillKeys).toEqual(['web-search']);
  });

  it('replaces the current slash trigger with a skill token', () => {
    const controller = new ChatComposerController();
    controller.sync([createChatComposerTextNode('please use /web')], { start: 15, end: 15 });

    const snapshot = controller.insertSkillToken('web-search', 'Web Search');

    expect(snapshot.selectedSkillKeys).toEqual(['web-search']);
    expect(snapshot.nodes).toEqual([
      expect.objectContaining({ type: 'text', text: 'please use ' }),
      expect.objectContaining({ type: 'token', tokenKey: 'web-search' })
    ]);
  });
});
