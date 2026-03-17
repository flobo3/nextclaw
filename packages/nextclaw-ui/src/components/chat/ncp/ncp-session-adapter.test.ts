import { adaptNcpSessionSummary, readNcpSessionPreferredThinking } from '@/components/chat/ncp/ncp-session-adapter';
import type { NcpSessionSummaryView } from '@/api/types';

function createSummary(partial: Partial<NcpSessionSummaryView> = {}): NcpSessionSummaryView {
  return {
    sessionId: 'ncp-session-1',
    messageCount: 3,
    updatedAt: '2026-03-18T00:00:00.000Z',
    status: 'idle',
    ...partial
  };
}

describe('adaptNcpSessionSummary', () => {
  it('maps session metadata into shared session entry fields', () => {
    const adapted = adaptNcpSessionSummary(
      createSummary({
        metadata: {
          label: 'NCP Planning Thread',
          model: 'openai/gpt-5',
          session_type: 'native'
        }
      })
    );

    expect(adapted).toMatchObject({
      key: 'ncp-session-1',
      label: 'NCP Planning Thread',
      preferredModel: 'openai/gpt-5',
      sessionType: 'native',
      sessionTypeMutable: false,
      messageCount: 3
    });
  });
});

describe('readNcpSessionPreferredThinking', () => {
  it('normalizes persisted thinking metadata for UI hydration', () => {
    const thinking = readNcpSessionPreferredThinking(
      createSummary({
        metadata: {
          preferred_thinking: 'HIGH'
        }
      })
    );

    expect(thinking).toBe('high');
  });
});
