import { useMemo } from 'react';
import { type UiMessage } from '@nextclaw/agent-chat';
import { adaptChatMessages, type ChatMessageSource } from '@/components/chat/adapters/chat-message.adapter';
import { useI18n } from '@/components/providers/I18nProvider';
import { ChatMessageList } from '@/components/chat/ui/chat-message-list/chat-message-list';
import { formatDateTime, t } from '@/lib/i18n';

type ChatMessageListContainerProps = {
  uiMessages: UiMessage[];
  isSending: boolean;
  className?: string;
};

export function ChatMessageListContainer(props: ChatMessageListContainerProps) {
  const { language } = useI18n();
  const sourceMessages = useMemo<ChatMessageSource[]>(
    () =>
      props.uiMessages.map((message) => ({
        id: message.id,
        role: message.role,
        meta: {
          timestamp: message.meta?.timestamp,
          status: message.meta?.status
        },
        parts: message.parts as unknown as ChatMessageSource['parts']
      })),
    [props.uiMessages]
  );

  const messages = useMemo(
    () =>
      adaptChatMessages({
        uiMessages: sourceMessages,
        formatTimestamp: (value) => formatDateTime(value, language),
        texts: {
          roleLabels: {
            user: t('chatRoleUser'),
            assistant: t('chatRoleAssistant'),
            tool: t('chatRoleTool'),
            system: t('chatRoleSystem'),
            fallback: t('chatRoleMessage')
          },
          reasoningLabel: t('chatReasoning'),
          toolCallLabel: t('chatToolCall'),
          toolResultLabel: t('chatToolResult'),
          toolNoOutputLabel: t('chatToolNoOutput'),
          toolOutputLabel: t('chatToolOutput'),
          unknownPartLabel: t('chatUnknownPart')
        }
      }),
    [language, sourceMessages]
  );

  return (
    <ChatMessageList
      messages={messages}
      isSending={props.isSending}
      hasStreamingDraft={props.uiMessages.some((message) => message.meta?.status === 'streaming')}
      className={props.className}
      texts={{
        copyCodeLabel: t('chatCodeCopy'),
        copiedCodeLabel: t('chatCodeCopied'),
        typingLabel: t('chatTyping')
      }}
    />
  );
}
