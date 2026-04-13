export type RuntimeControlEnvironment =
  | 'desktop-embedded'
  | 'managed-local-service'
  | 'self-hosted-web'
  | 'shared-web';

export type RuntimeLifecycleState =
  | 'healthy'
  | 'restarting-service'
  | 'restarting-app'
  | 'recovering'
  | 'unavailable'
  | 'failed';

export type RuntimeActionImpact = 'none' | 'brief-ui-disconnect' | 'full-app-relaunch';

export type RuntimeActionCapability = {
  available: boolean;
  requiresConfirmation: boolean;
  impact: RuntimeActionImpact;
  reasonIfUnavailable?: string;
};

export type RuntimeControlView = {
  environment: RuntimeControlEnvironment;
  lifecycle: RuntimeLifecycleState;
  canRestartService: RuntimeActionCapability;
  canRestartApp: RuntimeActionCapability;
  message?: string;
};

export type RuntimeRestartAction = 'restart-service' | 'restart-app';

export type RuntimeRestartResult = {
  accepted: boolean;
  action: RuntimeRestartAction;
  lifecycle: RuntimeLifecycleState;
  message: string;
};
