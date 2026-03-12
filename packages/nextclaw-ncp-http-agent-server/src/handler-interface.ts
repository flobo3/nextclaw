import type { NcpAgentEndpoint } from "@nextclaw/ncp";
import type { NcpHttpAgentReplayProvider } from "./types.js";

export interface NcpHttpAgentHandler {
  handleSend(request: Request): Promise<Response>;
  handleReconnect(request: Request): Promise<Response>;
  handleAbort(request: Request): Promise<Response>;
}

export type NcpHttpAgentHandlerOptions = {
  agentEndpoint: NcpAgentEndpoint;
  replayProvider?: NcpHttpAgentReplayProvider;
  timeoutMs: number;
};
