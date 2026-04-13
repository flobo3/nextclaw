import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRuntimeControl, useRestartRuntimeService } from '@/hooks/use-runtime-control';
import { t } from '@/lib/i18n';
import { runtimeControlManager } from '@/runtime-control/runtime-control.manager';
import type { RuntimeControlView, RuntimeLifecycleState } from '@/api/runtime-control.types';
import { Loader2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

function resolveLifecycleLabel(lifecycle: RuntimeLifecycleState): string {
  if (lifecycle === 'healthy') {
    return t('runtimeControlHealthy');
  }
  if (lifecycle === 'restarting-service') {
    return t('runtimeControlRestartingService');
  }
  if (lifecycle === 'restarting-app') {
    return t('runtimeControlRestartingApp');
  }
  if (lifecycle === 'recovering') {
    return t('runtimeControlRecovering');
  }
  if (lifecycle === 'failed') {
    return t('runtimeControlFailed');
  }
  return t('runtimeControlUnavailable');
}

function resolveEnvironmentLabel(view: RuntimeControlView): string {
  if (view.environment === 'desktop-embedded') {
    return t('runtimeControlEnvironmentDesktop');
  }
  if (view.environment === 'managed-local-service') {
    return t('runtimeControlEnvironmentManagedService');
  }
  if (view.environment === 'self-hosted-web') {
    return t('runtimeControlEnvironmentSelfHosted');
  }
  return t('runtimeControlEnvironmentSharedWeb');
}

export function RuntimeControlCard() {
  const queryClient = useQueryClient();
  const runtimeControlQuery = useRuntimeControl();
  const restartServiceMutation = useRestartRuntimeService();
  const [localLifecycle, setLocalLifecycle] = useState<RuntimeLifecycleState | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [restartingApp, setRestartingApp] = useState(false);

  const controlView = runtimeControlQuery.data;
  const displayedLifecycle = localLifecycle ?? controlView?.lifecycle ?? 'healthy';
  const lifecycleLabel = controlView || localLifecycle
    ? resolveLifecycleLabel(displayedLifecycle)
    : t('runtimeControlLoading');
  const displayedMessage = localMessage ?? controlView?.message ?? t('runtimeControlDescription');
  const busy = restartServiceMutation.isPending || restartingApp || localLifecycle === 'recovering';

  const handleRestartService = async () => {
    setLocalLifecycle('restarting-service');
    setLocalMessage(t('runtimeControlRestartingServiceHelp'));

    try {
      const result = await restartServiceMutation.mutateAsync();
      toast.success(result.message);
      setLocalLifecycle('recovering');
      setLocalMessage(t('runtimeControlRecoveringHelp'));
      const recoveredView = await runtimeControlManager.waitForRecovery();
      queryClient.setQueryData(['runtime-control'], recoveredView);
      await queryClient.invalidateQueries({ queryKey: ['runtime-control'] });
      setLocalLifecycle(null);
      setLocalMessage(null);
      toast.success(t('runtimeControlRecovered'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('runtimeControlRestartFailed');
      setLocalLifecycle('failed');
      setLocalMessage(message);
      toast.error(`${t('runtimeControlRestartFailed')}: ${message}`);
    }
  };

  const handleRestartApp = async () => {
    if (!controlView?.canRestartApp.available) {
      toast.error(controlView?.canRestartApp.reasonIfUnavailable ?? t('runtimeRestartAppUnavailable'));
      return;
    }
    if (!window.confirm(t('runtimeControlRestartAppConfirm'))) {
      return;
    }

    setRestartingApp(true);
    setLocalLifecycle('restarting-app');
    setLocalMessage(t('runtimeControlRestartingAppHelp'));

    try {
      const result = await runtimeControlManager.restartApp();
      toast.success(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('runtimeControlRestartFailed');
      setRestartingApp(false);
      setLocalLifecycle('failed');
      setLocalMessage(message);
      toast.error(`${t('runtimeControlRestartFailed')}: ${message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('runtimeControlTitle')}</CardTitle>
        <CardDescription>{t('runtimeControlDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium text-gray-900">{lifecycleLabel}</div>
            <div className="text-xs text-gray-500">
              {controlView ? resolveEnvironmentLabel(controlView) : t('runtimeControlLoading')}
            </div>
          </div>
          <p className="text-sm text-gray-600">{displayedMessage}</p>
          {runtimeControlQuery.isError && !busy && (
            <p className="text-sm text-amber-700">
              {runtimeControlQuery.error instanceof Error ? runtimeControlQuery.error.message : t('runtimeControlLoadFailed')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Button
            type="button"
            onClick={() => void handleRestartService()}
            disabled={!controlView?.canRestartService.available || busy}
          >
            {busy && displayedLifecycle !== 'restarting-app' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            {t('runtimeControlRestartService')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleRestartApp()}
            disabled={!controlView?.canRestartApp.available || busy}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            {t('runtimeControlRestartApp')}
          </Button>
        </div>

        {!controlView?.canRestartApp.available && controlView?.canRestartApp.reasonIfUnavailable && (
          <p className="text-xs text-gray-500">{controlView.canRestartApp.reasonIfUnavailable}</p>
        )}
      </CardContent>
    </Card>
  );
}
