import type { Config } from "@nextclaw/core";
import type { RemoteServiceModule } from "@nextclaw/remote";
import type { UiRemoteAccessHost, UiRuntimeControlHost } from "@nextclaw/server";
import type { RequestRestartParams } from "../../../types.js";
import { createRuntimeControlHost } from "../../runtime-support/runtime-control-host.js";
import { createRemoteAccessHost } from "./service-remote-access.js";

export function createServiceUiHosts(params: {
  serviceCommands: {
    startService: (options: { uiOverrides: Record<string, unknown>; open: boolean }) => Promise<void>;
    stopService: () => Promise<void>;
  };
  requestRestart: (params: RequestRestartParams) => Promise<void>;
  uiConfig: Pick<Config["ui"], "host" | "port">;
  remoteModule: RemoteServiceModule | null;
}): {
  remoteAccess: UiRemoteAccessHost;
  runtimeControl: UiRuntimeControlHost;
} {
  return {
    remoteAccess: createRemoteAccessHost(params),
    runtimeControl: createRuntimeControlHost({
      requestRestart: params.requestRestart,
      uiConfig: params.uiConfig
    })
  };
}
