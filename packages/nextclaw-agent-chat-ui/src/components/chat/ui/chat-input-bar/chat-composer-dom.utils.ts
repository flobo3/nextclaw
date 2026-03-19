import type { ChatComposerNode, ChatComposerSelection } from '../../view-models/chat-ui.types';
import {
  createChatComposerTextNode,
  createChatComposerTokenNode,
  getChatComposerNodeLength,
  normalizeChatComposerNodes
} from './chat-composer.utils';

export function buildNodeStartMap(nodes: ChatComposerNode[]): Map<string, number> {
  const map = new Map<string, number>();
  let cursor = 0;
  for (const node of nodes) {
    map.set(node.id, cursor);
    cursor += getChatComposerNodeLength(node);
  }
  return map;
}

function resolveRootChildIndex(root: HTMLDivElement, target: Node): number {
  let current: Node | null = target;
  while (current && current.parentNode !== root) {
    current = current.parentNode;
  }
  if (!current) {
    return root.childNodes.length;
  }
  return Array.prototype.indexOf.call(root.childNodes, current);
}

function findNodeByDomChild(
  child: Node | undefined,
  index: number,
  nodes: ChatComposerNode[]
): ChatComposerNode | undefined {
  if (child instanceof HTMLElement) {
    const nodeId = child.dataset.composerNodeId;
    if (nodeId) {
      return nodes.find((node) => node.id === nodeId);
    }
  }
  return nodes[index];
}

function sumNodeLengthsBeforeChildIndex(
  root: HTMLDivElement,
  nodes: ChatComposerNode[],
  childIndex: number
): number {
  let value = 0;
  for (let index = 0; index < childIndex; index += 1) {
    const matched = findNodeByDomChild(root.childNodes[index], index, nodes);
    if (matched) {
      value += getChatComposerNodeLength(matched);
    }
  }
  return value;
}

function resolveDirectRootTextNodeOffset(
  root: HTMLDivElement,
  container: Node,
  offset: number,
  nodes: ChatComposerNode[]
): number {
  const childIndex = resolveRootChildIndex(root, container);
  const valueBeforeNode = sumNodeLengthsBeforeChildIndex(root, nodes, childIndex);
  const currentNode = nodes[childIndex];
  if (currentNode?.type === 'text') {
    return valueBeforeNode + Math.min(offset, currentNode.text.length);
  }
  return valueBeforeNode + Math.min(offset, container.textContent?.length ?? 0);
}

function resolveElementBackedOffset(
  container: Node,
  offset: number,
  matched: ChatComposerNode,
  nodeStart: number,
  element: HTMLElement
): number {
  if (matched.type === 'text') {
    if (container.nodeType === Node.TEXT_NODE) {
      return nodeStart + Math.min(offset, matched.text.length);
    }
    if (container === element) {
      return nodeStart + (offset > 0 ? matched.text.length : 0);
    }
    return nodeStart + matched.text.length;
  }
  if (container === element) {
    return nodeStart + (offset > 0 ? 1 : 0);
  }
  return nodeStart + 1;
}

function resolveSelectionPointOffset(
  root: HTMLDivElement,
  container: Node,
  offset: number,
  nodes: ChatComposerNode[],
  nodeStartMap: Map<string, number>
): number {
  if (container === root) {
    return sumNodeLengthsBeforeChildIndex(root, nodes, offset);
  }

  if (container.nodeType === Node.TEXT_NODE && container.parentNode === root) {
    return resolveDirectRootTextNodeOffset(root, container, offset, nodes);
  }

  const element =
    container instanceof HTMLElement
      ? container.closest('[data-composer-node-id]')
      : container.parentElement?.closest('[data-composer-node-id]') ?? null;

  if (!(element instanceof HTMLElement)) {
    const childIndex = resolveRootChildIndex(root, container);
    return resolveSelectionPointOffset(root, root, childIndex, nodes, nodeStartMap);
  }

  const nodeId = element.dataset.composerNodeId;
  if (!nodeId) {
    return 0;
  }
  const matched = nodes.find((node) => node.id === nodeId);
  const nodeStart = nodeStartMap.get(nodeId) ?? 0;
  if (!matched) {
    return nodeStart;
  }
  return resolveElementBackedOffset(container, offset, matched, nodeStart, element);
}

export function readComposerSelection(root: HTMLDivElement, nodes: ChatComposerNode[]): ChatComposerSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const nodeStartMap = buildNodeStartMap(nodes);
  const start = resolveSelectionPointOffset(root, range.startContainer, range.startOffset, nodes, nodeStartMap);
  const end = resolveSelectionPointOffset(root, range.endContainer, range.endOffset, nodes, nodeStartMap);
  return {
    start: Math.min(start, end),
    end: Math.max(start, end)
  };
}

export type ChatComposerDomState = {
  nodes: ChatComposerNode[];
  selection: ChatComposerSelection | null;
};

export function restoreComposerSelection(
  root: HTMLDivElement,
  nodes: ChatComposerNode[],
  selection: ChatComposerSelection | null
) {
  if (!selection) {
    return;
  }
  const browserSelection = window.getSelection();
  if (!browserSelection) {
    return;
  }

  const resolveBoundary = (docOffset: number): { container: Node; offset: number } => {
    let cursor = 0;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const nodeLength = getChatComposerNodeLength(node);
      const nodeStart = cursor;
      const nodeEnd = cursor + nodeLength;
      const element = root.childNodes[index] as HTMLElement | undefined;
      if (!element) {
        cursor = nodeEnd;
        continue;
      }

      if (node.type === 'text') {
        if (docOffset <= nodeEnd) {
          const textNode = element.firstChild ?? element;
          return {
            container: textNode,
            offset: Math.max(0, Math.min(docOffset - nodeStart, node.text.length))
          };
        }
      } else {
        if (docOffset <= nodeStart) {
          return { container: root, offset: index };
        }
        if (docOffset <= nodeEnd) {
          return { container: root, offset: index + 1 };
        }
      }

      cursor = nodeEnd;
    }

    return {
      container: root,
      offset: root.childNodes.length
    };
  };

  const startBoundary = resolveBoundary(selection.start);
  const endBoundary = resolveBoundary(selection.end);
  const range = document.createRange();
  range.setStart(startBoundary.container, startBoundary.offset);
  range.setEnd(endBoundary.container, endBoundary.offset);
  browserSelection.removeAllRanges();
  browserSelection.addRange(range);
}

export function parseComposerNodesFromDom(root: HTMLDivElement): ChatComposerNode[] {
  const parsedNodes: ChatComposerNode[] = [];
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      parsedNodes.push(createChatComposerTextNode(child.textContent ?? ''));
      continue;
    }
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    const nodeType = child.dataset.composerNodeType;
    if (nodeType === 'token') {
      const tokenKind = child.dataset.composerTokenKind as 'skill' | 'file' | undefined;
      const tokenKey = child.dataset.composerTokenKey;
      const label = child.dataset.composerLabel;
      if (tokenKind && tokenKey && label) {
        parsedNodes.push({
          id: child.dataset.composerNodeId ?? createChatComposerTokenNode({ tokenKind, tokenKey, label }).id,
          type: 'token',
          tokenKind,
          tokenKey,
          label
        });
      }
      continue;
    }
    const text = child.textContent ?? '';
    parsedNodes.push({
      id: child.dataset.composerNodeId ?? createChatComposerTextNode(text).id,
      type: 'text',
      text
    });
  }
  return normalizeChatComposerNodes(parsedNodes);
}

export function readComposerDocumentStateFromDom(root: HTMLDivElement): ChatComposerDomState {
  const nodes = parseComposerNodesFromDom(root);
  return {
    nodes,
    selection: readComposerSelection(root, nodes)
  };
}
