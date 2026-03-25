import type { ChatComposerNode } from '@nextclaw/agent-chat-ui';
import type { NcpDraftAttachment } from '@nextclaw/ncp-react';
import {
  createChatComposerTokenNode,
  createChatComposerNodesFromText,
  createEmptyChatComposerNodes,
  extractChatComposerTokenKeys,
  normalizeChatComposerNodes,
  removeChatComposerTokenNodes,
  serializeChatComposerPlainText
} from '@nextclaw/agent-chat-ui';

export function createInitialChatComposerNodes(): ChatComposerNode[] {
  return createEmptyChatComposerNodes();
}

export function createChatComposerNodesFromDraft(text: string): ChatComposerNode[] {
  return createChatComposerNodesFromText(text);
}

export function deriveChatComposerDraft(nodes: ChatComposerNode[]): string {
  return serializeChatComposerPlainText(nodes);
}

export function deriveSelectedSkillsFromComposer(nodes: ChatComposerNode[]): string[] {
  return extractChatComposerTokenKeys(nodes, 'skill');
}

export function deriveSelectedAttachmentIdsFromComposer(nodes: ChatComposerNode[]): string[] {
  return extractChatComposerTokenKeys(nodes, 'file');
}

export function syncComposerSkills(
  nodes: ChatComposerNode[],
  nextSkills: string[],
  skillRecords: Array<{ spec: string; label?: string }>
): ChatComposerNode[] {
  const nextSkillSet = new Set(nextSkills);
  const prunedNodes = removeChatComposerTokenNodes(
    nodes,
    (node) => node.tokenKind === 'skill' && !nextSkillSet.has(node.tokenKey)
  );
  const existingSkills = extractChatComposerTokenKeys(prunedNodes, 'skill');
  const recordMap = new Map(skillRecords.map((record) => [record.spec, record]));
  const appendedNodes = nextSkills
    .filter((skill) => !existingSkills.includes(skill))
    .map((skill) =>
      createChatComposerTokenNode({
        tokenKind: 'skill',
        tokenKey: skill,
        label: recordMap.get(skill)?.label || skill
      })
    );

  return appendedNodes.length === 0
    ? prunedNodes
    : normalizeChatComposerNodes([...prunedNodes, ...appendedNodes]);
}

export function syncComposerAttachments(
  nodes: ChatComposerNode[],
  attachments: readonly NcpDraftAttachment[]
): ChatComposerNode[] {
  const nextAttachmentIds = new Set(attachments.map((attachment) => attachment.id));
  const prunedNodes = removeChatComposerTokenNodes(
    nodes,
    (node) => node.tokenKind === 'file' && !nextAttachmentIds.has(node.tokenKey)
  );
  const existingAttachmentIds = extractChatComposerTokenKeys(prunedNodes, 'file');
  const appendedNodes = attachments
    .filter((attachment) => !existingAttachmentIds.includes(attachment.id))
    .map((attachment) =>
      createChatComposerTokenNode({
        tokenKind: 'file',
        tokenKey: attachment.id,
        label: attachment.name
      })
    );

  return appendedNodes.length === 0
    ? prunedNodes
    : normalizeChatComposerNodes([...prunedNodes, ...appendedNodes]);
}

export function pruneComposerAttachments(
  nodes: ChatComposerNode[],
  attachments: readonly NcpDraftAttachment[]
): NcpDraftAttachment[] {
  const selectedIds = new Set(deriveSelectedAttachmentIdsFromComposer(nodes));
  return attachments.filter((attachment) => selectedIds.has(attachment.id));
}
