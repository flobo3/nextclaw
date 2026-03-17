import { describe, expect, it, vi } from 'vitest';
import { resolveChatChain } from '@/components/chat/chat-chain';

describe('resolveChatChain', () => {
  it('defaults to legacy when no query or env override is provided', () => {
    vi.stubEnv('VITE_CHAT_CHAIN', '');

    expect(resolveChatChain('')).toBe('legacy');
  });

  it('allows explicit ncp switch from query string', () => {
    vi.stubEnv('VITE_CHAT_CHAIN', 'legacy');

    expect(resolveChatChain('?chatChain=ncp')).toBe('ncp');
  });

  it('accepts env override when query string is absent', () => {
    vi.stubEnv('VITE_CHAT_CHAIN', 'ncp');

    expect(resolveChatChain('')).toBe('ncp');
  });
});
