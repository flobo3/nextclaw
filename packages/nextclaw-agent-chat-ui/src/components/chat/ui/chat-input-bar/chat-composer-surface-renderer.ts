import type { ChatComposerNode, ChatComposerSelection } from '../../view-models/chat-ui.types';
import { isChatComposerSelectionInsideRange } from './chat-composer.utils';

type RenderParams = {
  nodes: ChatComposerNode[];
  selectedRange: ChatComposerSelection | null;
  nodeStartMap: Map<string, number>;
};

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class ChatComposerSurfaceRenderer {
  render = (root: HTMLDivElement | null, params: RenderParams): void => {
    if (!root) {
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const node of params.nodes) {
      const element = node.type === 'text'
        ? this.createTextNodeElement(node)
        : this.createTokenNodeElement(node, params.selectedRange, params.nodeStartMap);

      if (element) {
        fragment.appendChild(element);
      }
    }

    root.replaceChildren(fragment);
  };

  private readonly createTextNodeElement = (node: Extract<ChatComposerNode, { type: 'text' }>): HTMLSpanElement | null => {
    if (node.text.length === 0) {
      return null;
    }

    const element = document.createElement('span');
    element.dataset.composerNodeId = node.id;
    element.dataset.composerNodeType = 'text';
    element.textContent = node.text;
    return element;
  };

  private readonly createTokenNodeElement = (
    node: Extract<ChatComposerNode, { type: 'token' }>,
    selectedRange: ChatComposerSelection | null,
    nodeStartMap: Map<string, number>
  ): HTMLSpanElement => {
    const nodeStart = nodeStartMap.get(node.id) ?? 0;
    const isSelected = isChatComposerSelectionInsideRange(selectedRange, nodeStart, nodeStart + 1);
    const element = document.createElement('span');

    element.contentEditable = 'false';
    element.dataset.composerNodeId = node.id;
    element.dataset.composerNodeType = 'token';
    element.dataset.composerTokenKind = node.tokenKind;
    element.dataset.composerTokenKey = node.tokenKey;
    element.dataset.composerLabel = node.label;
    element.className = [
      'mx-[2px]',
      'inline-flex',
      'h-6',
      'max-w-full',
      'items-center',
      'gap-1',
      'rounded-md',
      'border',
      'px-1.5',
      'align-baseline',
      'text-[11px]',
      'font-medium',
      'transition',
      isSelected
        ? 'border-primary/30 bg-primary/18 text-primary'
        : 'border-primary/12 bg-primary/8 text-primary'
    ].join(' ');

    element.append(this.createTokenIcon(node.tokenKind));

    const label = document.createElement('span');
    label.className = 'truncate';
    label.textContent = node.label;
    element.append(label);

    return element;
  };

  private readonly createTokenIcon = (tokenKind: 'skill' | 'file'): HTMLElement => {
    const wrapper = document.createElement('span');
    wrapper.className = 'inline-flex h-3 w-3 shrink-0 items-center justify-center text-primary/70';
    wrapper.append(tokenKind === 'file' ? this.createFileIcon() : this.createSkillIcon());
    return wrapper;
  };

  private readonly createSkillIcon = (): SVGSVGElement => {
    return this.createSvgIcon([
      { tag: 'path', attrs: { d: 'M8.5 2.75 2.75 6l5.75 3.25L14.25 6 8.5 2.75Z' } },
      { tag: 'path', attrs: { d: 'M2.75 10 8.5 13.25 14.25 10' } },
      { tag: 'path', attrs: { d: 'M2.75 6v4l5.75 3.25V9.25L2.75 6Z' } },
      { tag: 'path', attrs: { d: 'M14.25 6v4L8.5 13.25V9.25L14.25 6Z' } }
    ]);
  };

  private readonly createFileIcon = (): SVGSVGElement => {
    return this.createSvgIcon([
      { tag: 'path', attrs: { d: 'M5.25 2.75h4.5L13 6v7.25A1.75 1.75 0 0 1 11.25 15h-6.5A1.75 1.75 0 0 1 3 13.25v-8.75A1.75 1.75 0 0 1 4.75 2.75Z' } },
      { tag: 'path', attrs: { d: 'M9.75 2.75V6H13' } },
      { tag: 'path', attrs: { d: 'M5.75 8.75h4.5' } },
      { tag: 'path', attrs: { d: 'M5.75 10.75h4.5' } }
    ]);
  };

  private readonly createSvgIcon = (
    children: Array<{ tag: 'path'; attrs: Record<string, string> }>
  ): SVGSVGElement => {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.25');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'h-3 w-3');

    for (const child of children) {
      const element = document.createElementNS(SVG_NAMESPACE, child.tag);
      for (const [key, value] of Object.entries(child.attrs)) {
        element.setAttribute(key, value);
      }
      svg.append(element);
    }

    return svg;
  };
}
