import { render, screen, waitFor } from '@testing-library/react';
import { ChannelForm } from './ChannelForm';

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    data: {
      channels: {
        weixin: {
          enabled: false
        }
      }
    }
  }),
  useConfigMeta: () => ({
    data: {
      channels: [
        {
          name: 'weixin',
          displayName: 'Weixin',
          enabled: false
        }
      ]
    }
  }),
  useConfigSchema: () => ({
    data: {
      uiHints: {},
      actions: []
    }
  }),
  useUpdateChannel: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false
  }),
  useExecuteConfigAction: () => ({
    mutateAsync: vi.fn(),
    isPending: false
  })
}));

describe('ChannelForm', () => {
  it('renders the empty selection state without entering a render loop', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ChannelForm />);

    expect(await screen.findByText('Select a channel from the left to configure')).toBeTruthy();

    await waitFor(() => {
      expect(
        consoleErrorSpy.mock.calls.some((call) =>
          call.some((entry) => typeof entry === 'string' && entry.includes('Maximum update depth exceeded'))
        )
      ).toBe(false);
    });

    consoleErrorSpy.mockRestore();
  });
});
