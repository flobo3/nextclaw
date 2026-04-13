import type { Config } from "@nextclaw/core";
import type {
  RuntimeControlView,
  RuntimeRestartResult,
  UiRuntimeControlHost
} from "@nextclaw/server";
import type { RequestRestartParams } from "../../types.js";

const RESTART_SERVICE_REASON = "runtime control service restart";

export class RuntimeControlHost implements UiRuntimeControlHost {
  constructor(
    private readonly deps: {
      requestRestart: (params: RequestRestartParams) => Promise<void>;
      uiConfig: Pick<Config["ui"], "port">;
    }
  ) {}

  getControl = (): RuntimeControlView => {
    return {
      environment: "managed-local-service",
      lifecycle: "healthy",
      message: "Restart the NextClaw runtime when you want to recover the local service without changing settings.",
      canRestartService: {
        available: true,
        requiresConfirmation: false,
        impact: "brief-ui-disconnect"
      },
      canRestartApp: {
        available: false,
        requiresConfirmation: true,
        impact: "full-app-relaunch",
        reasonIfUnavailable: "App restart is only available in the desktop shell."
      }
    };
  };

  restartService = async (): Promise<RuntimeRestartResult> => {
    await this.deps.requestRestart({
      reason: RESTART_SERVICE_REASON,
      manualMessage: `Restart the managed service to restore the UI on port ${this.deps.uiConfig.port}.`,
      strategy: "background-service-or-exit",
      delayMs: 500,
      silentOnServiceRestart: true
    });
    return {
      accepted: true,
      action: "restart-service",
      lifecycle: "restarting-service",
      message: "Restart scheduled. This page may disconnect for a few seconds."
    };
  };
}

export function createRuntimeControlHost(params: {
  requestRestart: (params: RequestRestartParams) => Promise<void>;
  uiConfig: Pick<Config["ui"], "port">;
}): RuntimeControlHost {
  return new RuntimeControlHost(params);
}
