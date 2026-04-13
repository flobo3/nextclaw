import { fetchRuntimeControl, restartRuntimeService } from '@/api/runtime-control';
import type { RuntimeControlView, RuntimeRestartResult } from '@/api/runtime-control.types';
import type { NextClawDesktopBridge } from '@/desktop/desktop-update.types';
import { t } from '@/lib/i18n';

type RecoveryWaitOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
};

export class RuntimeControlManager {
  getControl = async (): Promise<RuntimeControlView> => {
    return this.decorateForCurrentEnvironment(await fetchRuntimeControl());
  };

  restartService = async (): Promise<RuntimeRestartResult> => {
    const desktopBridge = this.getDesktopBridge();
    if (desktopBridge && typeof desktopBridge.restartService === 'function') {
      return await desktopBridge.restartService();
    }
    return await restartRuntimeService();
  };

  restartApp = async (): Promise<RuntimeRestartResult> => {
    const desktopBridge = this.getDesktopBridge();
    if (!desktopBridge || typeof desktopBridge.restartApp !== 'function') {
      throw new Error(t('runtimeRestartAppUnavailable'));
    }
    return await desktopBridge.restartApp();
  };

  waitForRecovery = async (options: RecoveryWaitOptions = {}): Promise<RuntimeControlView> => {
    const timeoutMs = options.timeoutMs ?? 25_000;
    const pollIntervalMs = options.pollIntervalMs ?? 1_500;
    const deadline = Date.now() + timeoutMs;

    let lastError: unknown = null;
    while (Date.now() < deadline) {
      try {
        return await this.getControl();
      } catch (error) {
        lastError = error;
        await this.sleep(pollIntervalMs);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(t('runtimeRecoveryTimedOut'));
  };

  decorateForCurrentEnvironment = (view: RuntimeControlView): RuntimeControlView => {
    const desktopBridge = this.getDesktopBridge();
    if (!desktopBridge || typeof desktopBridge.restartApp !== 'function') {
      return view;
    }

    return {
      ...view,
      environment: 'desktop-embedded',
      canRestartApp: {
        available: true,
        requiresConfirmation: true,
        impact: 'full-app-relaunch'
      }
    };
  };

  private getDesktopBridge = (): NextClawDesktopBridge | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.nextclawDesktop ?? null;
  };

  private sleep = async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  };
}

export const runtimeControlManager = new RuntimeControlManager();
