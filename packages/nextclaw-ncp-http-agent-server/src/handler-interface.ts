import type { NcpAgentClientEndpoint } from "@nextclaw/ncp";
import type { NcpHttpAgentStreamProvider } from "./types.js";

/** Framework-agnostic HTTP handler interface for NCP agent routes. */
export interface NcpHttpAgentHandler {
  handleSend(request: Request): Promise<Response>;
  handleStream(request: Request): Promise<Response>;
  handleAbort(request: Request): Promise<Response>;
}

export type NcpHttpAgentHandlerOptions = {
  agentClientEndpoint: NcpAgentClientEndpoint;
  /**
   * Optional. When set, `/stream` serves stored events instead of forwarding to the agent.
   * See NcpHttpAgentStreamProvider for details.
   */
  streamProvider?: NcpHttpAgentStreamProvider;
  timeoutMs: number;
};
