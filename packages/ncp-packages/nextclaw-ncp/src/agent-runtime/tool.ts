export type NcpToolDefinition = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export interface NcpTool {
  readonly name: string;
  readonly description?: string;
  readonly parameters?: Record<string, unknown>;
  execute(args: unknown): Promise<unknown>;
}

export type NcpToolCallResult = {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result: unknown;
};

export interface NcpToolRegistry {
  listTools(): ReadonlyArray<NcpTool>;
  getTool(name: string): NcpTool | undefined;
  getToolDefinitions(): ReadonlyArray<NcpToolDefinition>;
  execute(toolCallId: string, toolName: string, args: unknown): Promise<unknown>;
}
