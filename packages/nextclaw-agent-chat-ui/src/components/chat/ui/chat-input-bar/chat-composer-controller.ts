import type { ChatComposerNode, ChatComposerSelection, ChatSkillPickerOption } from '../../view-models/chat-ui.types';
import {
  createChatComposerTextNode,
  createChatComposerTokenNode,
  createEmptyChatComposerNodes,
  extractChatComposerTokenKeys,
  getChatComposerNodeLength,
  normalizeChatComposerNodes,
  removeChatComposerTokenNodes,
  replaceChatComposerRange,
  resolveChatComposerSlashTrigger
} from './chat-composer.utils';
import { buildNodeStartMap } from './chat-composer-dom.utils';

export type ChatComposerControllerSnapshot = {
  nodes: ChatComposerNode[];
  selection: ChatComposerSelection | null;
  nodeStartMap: Map<string, number>;
  documentLength: number;
  selectedSkillKeys: string[];
  slashTrigger: { query: string; start: number; end: number } | null;
};

export class ChatComposerController {
  private nodes: ChatComposerNode[] = createEmptyChatComposerNodes();
  private selection: ChatComposerSelection | null = null;

  sync = (nodes: ChatComposerNode[], selection: ChatComposerSelection | null): ChatComposerControllerSnapshot => {
    this.nodes = normalizeChatComposerNodes(nodes);
    this.selection = selection;
    return this.getSnapshot();
  };

  setSelection = (selection: ChatComposerSelection | null): ChatComposerControllerSnapshot => {
    this.selection = selection;
    return this.getSnapshot();
  };

  replaceDocument = (nodes: ChatComposerNode[], selection: ChatComposerSelection | null): ChatComposerControllerSnapshot => {
    this.nodes = normalizeChatComposerNodes(nodes);
    this.selection = selection;
    return this.getSnapshot();
  };

  insertText = (text: string): ChatComposerControllerSnapshot => {
    const selection = this.selection ?? { start: 0, end: 0 };
    this.nodes = replaceChatComposerRange(this.nodes, selection.start, selection.end, [createChatComposerTextNode(text)]);
    const nextOffset = selection.start + text.length;
    this.selection = { start: nextOffset, end: nextOffset };
    return this.getSnapshot();
  };

  insertFileToken = (tokenKey: string, label: string): ChatComposerControllerSnapshot => {
    return this.insertToken("file", tokenKey, label);
  };

  insertSkillToken = (tokenKey: string, label: string): ChatComposerControllerSnapshot => {
    if (this.getSelectedSkillKeys().includes(tokenKey)) {
      return this.getSnapshot();
    }
    return this.insertToken("skill", tokenKey, label, this.getSlashTrigger());
  };

  syncSelectedSkills = (nextKeys: string[], options: ChatSkillPickerOption[]): ChatComposerControllerSnapshot => {
    const selectedSkillKeys = this.getSelectedSkillKeys();
    const optionMap = new Map(options.map((option) => [option.key, option]));
    const addedKey = nextKeys.find((key) => !selectedSkillKeys.includes(key));
    if (addedKey) {
      const option = optionMap.get(addedKey);
      return this.insertSkillToken(addedKey, option?.label ?? addedKey);
    }

    const removedKey = selectedSkillKeys.find((key) => !nextKeys.includes(key));
    if (removedKey) {
      this.nodes = removeChatComposerTokenNodes(
        this.nodes,
        (node) => node.tokenKind === 'skill' && node.tokenKey === removedKey
      );
    }
    return this.getSnapshot();
  };

  deleteContent = (direction: 'backward' | 'forward'): ChatComposerControllerSnapshot => {
    const documentLength = this.getDocumentLength();
    const selection = this.selection ?? { start: documentLength, end: documentLength };
    let rangeStart = selection.start;
    let rangeEnd = selection.end;

    if (selection.start === selection.end) {
      if (direction === 'backward' && selection.start > 0) {
        rangeStart = selection.start - 1;
      } else if (direction === 'forward') {
        rangeEnd = selection.end + 1;
      } else {
        return this.getSnapshot();
      }
    }

    this.nodes = replaceChatComposerRange(this.nodes, rangeStart, rangeEnd, []);
    this.selection = { start: rangeStart, end: rangeStart };
    return this.getSnapshot();
  };

  getSnapshot = (): ChatComposerControllerSnapshot => {
    return {
      nodes: this.nodes,
      selection: this.selection,
      nodeStartMap: buildNodeStartMap(this.nodes),
      documentLength: this.getDocumentLength(),
      selectedSkillKeys: this.getSelectedSkillKeys(),
      slashTrigger: this.getSlashTrigger()
    };
  };

  private readonly getDocumentLength = (): number => {
    return this.nodes.reduce((sum, node) => sum + getChatComposerNodeLength(node), 0);
  };

  private readonly getSelectedSkillKeys = (): string[] => {
    return extractChatComposerTokenKeys(this.nodes, 'skill');
  };

  private readonly insertToken = (
    tokenKind: "skill" | "file",
    tokenKey: string,
    label: string,
    trigger = null as { query: string; start: number; end: number } | null,
  ): ChatComposerControllerSnapshot => {
    const documentLength = this.getDocumentLength();
    const replaceStart = trigger?.start ?? this.selection?.start ?? documentLength;
    const replaceEnd = trigger?.end ?? this.selection?.end ?? replaceStart;
    this.nodes = replaceChatComposerRange(
      this.nodes,
      replaceStart,
      replaceEnd,
      [createChatComposerTokenNode({ tokenKind, tokenKey, label })],
    );
    this.selection = { start: replaceStart + 1, end: replaceStart + 1 };
    return this.getSnapshot();
  };

  private readonly getSlashTrigger = (): { query: string; start: number; end: number } | null => {
    return resolveChatComposerSlashTrigger(this.nodes, this.selection);
  };
}
