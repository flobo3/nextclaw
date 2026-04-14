import type { SessionManager } from "@nextclaw/core";
import type { NcpTool } from "@nextclaw/ncp";
import { NextclawAgentSessionStore } from "../nextclaw-agent-session-store.js";
import { SessionSearchFeatureService } from "./session-search-feature.service.js";

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class SessionSearchRuntimeSupport {
  private readonly feature: SessionSearchFeatureService;

  constructor(
    params: {
      sessionManager: SessionManager;
      onSessionUpdated?: (sessionKey: string) => void;
      databasePath: string;
    },
  ) {
    this.onSessionUpdated = params.onSessionUpdated;
    this.feature = new SessionSearchFeatureService({
      sessionStore: new NextclawAgentSessionStore(params.sessionManager),
      databasePath: params.databasePath,
    });
  }

  private readonly onSessionUpdated?: (sessionKey: string) => void;

  initialize = async (): Promise<void> => {
    await this.feature.initialize();
  };

  createTool = (params: { currentSessionId?: string }): NcpTool =>
    this.feature.createTool(params);

  handleSessionUpdated = (sessionKey: string): void => {
    this.onSessionUpdated?.(sessionKey);
    void this.feature.handleSessionUpdated(sessionKey).catch((error) => {
      console.warn(`[session-search] Failed to update ${sessionKey}: ${formatErrorMessage(error)}`);
    });
  };

  dispose = async (): Promise<void> => {
    await this.feature.dispose();
  };
}
