import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatWelcome } from '@/components/chat/ChatWelcome';

describe('ChatWelcome', () => {
  it('renders draft agent choices and allows switching', () => {
    const onCreateSession = vi.fn();
    const onSelectAgent = vi.fn();

    render(
      <ChatWelcome
        onCreateSession={onCreateSession}
        agents={[
          { id: 'main', displayName: 'Main' },
          { id: 'engineer', displayName: 'Engineer' }
        ]}
        selectedAgentId="main"
        onSelectAgent={onSelectAgent}
      />
    );

    fireEvent.click(screen.getByText('Engineer'));
    expect(onSelectAgent).toHaveBeenCalledWith('engineer');
  });
});
