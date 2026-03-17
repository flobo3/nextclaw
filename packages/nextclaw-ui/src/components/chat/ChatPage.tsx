import { useLocation } from 'react-router-dom';
import { resolveChatChain } from '@/components/chat/chat-chain';
import type { ChatPageProps } from '@/components/chat/chat-page-shell';
import { LegacyChatPage } from '@/components/chat/legacy/LegacyChatPage';
import { NcpChatPage } from '@/components/chat/ncp/NcpChatPage';

export function ChatPage({ view }: ChatPageProps) {
  const location = useLocation();
  const chatChain = resolveChatChain(location.search);

  if (chatChain === 'ncp') {
    return <NcpChatPage view={view} />;
  }

  return <LegacyChatPage view={view} />;
}
