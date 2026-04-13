import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { RuntimeControlCard } from '@/components/config/runtime-control-card';
import { setLanguage } from '@/lib/i18n';

const mocks = vi.hoisted(() => ({
  useRuntimeControl: vi.fn(),
  useRestartRuntimeService: vi.fn(),
  waitForRecovery: vi.fn(),
  restartApp: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/use-runtime-control', () => ({
  useRuntimeControl: (...args: unknown[]) => mocks.useRuntimeControl(...args),
  useRestartRuntimeService: (...args: unknown[]) => mocks.useRestartRuntimeService(...args),
}));

vi.mock('@/runtime-control/runtime-control.manager', () => ({
  runtimeControlManager: {
    waitForRecovery: (...args: unknown[]) => mocks.waitForRecovery(...args),
    restartApp: (...args: unknown[]) => mocks.restartApp(...args),
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('RuntimeControlCard', () => {
  beforeEach(() => {
    setLanguage('zh');
    vi.clearAllMocks();
    mocks.useRuntimeControl.mockReturnValue({
      data: {
        environment: 'managed-local-service',
        lifecycle: 'healthy',
        message: 'runtime healthy',
        canRestartService: {
          available: true,
          requiresConfirmation: false,
          impact: 'brief-ui-disconnect',
        },
        canRestartApp: {
          available: false,
          requiresConfirmation: true,
          impact: 'full-app-relaunch',
          reasonIfUnavailable: 'desktop only',
        },
      },
      isError: false,
      error: null,
    });
    mocks.useRestartRuntimeService.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        accepted: true,
        action: 'restart-service',
        lifecycle: 'restarting-service',
        message: 'Restart scheduled. This page may disconnect for a few seconds.',
      }),
      isPending: false,
    });
    mocks.waitForRecovery.mockResolvedValue({
      environment: 'managed-local-service',
      lifecycle: 'healthy',
      message: 'runtime healthy',
      canRestartService: {
        available: true,
        requiresConfirmation: false,
        impact: 'brief-ui-disconnect',
      },
      canRestartApp: {
        available: false,
        requiresConfirmation: true,
        impact: 'full-app-relaunch',
        reasonIfUnavailable: 'desktop only',
      },
    });
    mocks.restartApp.mockResolvedValue({
      accepted: true,
      action: 'restart-app',
      lifecycle: 'restarting-app',
      message: 'NextClaw app restart scheduled.',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders runtime control actions from the current capability view', () => {
    const queryClient = new QueryClient();

    render(<RuntimeControlCard />, {
      wrapper: createWrapper(queryClient),
    });

    const restartAppButton = screen.getByRole('button', { name: '重启应用' }) as HTMLButtonElement;
    expect(screen.getByText('运行时控制')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重启服务' })).toBeTruthy();
    expect(restartAppButton.disabled).toBe(true);
    expect(screen.getByText('desktop only')).toBeTruthy();
  });

  it('runs the restart service flow and waits for recovery', async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const mutateAsync = vi.fn().mockResolvedValue({
      accepted: true,
      action: 'restart-service',
      lifecycle: 'restarting-service',
      message: 'Restart scheduled. This page may disconnect for a few seconds.',
    });
    mocks.useRestartRuntimeService.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<RuntimeControlCard />, {
      wrapper: createWrapper(queryClient),
    });

    await user.click(screen.getByRole('button', { name: '重启服务' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(mocks.waitForRecovery).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith('Restart scheduled. This page may disconnect for a few seconds.');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['runtime-control'] });
  });

  it('runs the desktop restart app flow after confirmation', async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();

    mocks.useRuntimeControl.mockReturnValue({
      data: {
        environment: 'desktop-embedded',
        lifecycle: 'healthy',
        message: 'runtime healthy',
        canRestartService: {
          available: true,
          requiresConfirmation: false,
          impact: 'brief-ui-disconnect',
        },
        canRestartApp: {
          available: true,
          requiresConfirmation: true,
          impact: 'full-app-relaunch',
        },
      },
      isError: false,
      error: null,
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<RuntimeControlCard />, {
      wrapper: createWrapper(queryClient),
    });

    await user.click(screen.getByRole('button', { name: '重启应用' }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(mocks.restartApp).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith('NextClaw app restart scheduled.');
  });
});
