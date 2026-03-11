export type NcpMessageRole = "user" | "assistant" | "system" | "tool" | "endpoint";

export type NcpMessageStatus = "pending" | "streaming" | "final" | "error";

export type NcpTextPart = {
  type: "text";
  text: string;
};

export type NcpFilePart = {
  type: "file";
  name?: string;
  mimeType?: string;
  url?: string;
  contentBase64?: string;
  sizeBytes?: number;
};

export type NcpSourcePart = {
  type: "source";
  title?: string;
  url?: string;
  snippet?: string;
};

export type NcpStepStartPart = {
  type: "step-start";
  stepId?: string;
  title?: string;
};

export type NcpReasoningPart = {
  type: "reasoning";
  text: string;
};

export type NcpToolInvocationPart = {
  type: "tool-invocation";
  toolName: string;
  toolCallId?: string;
  state?: "start" | "delta" | "end" | "result";
  args?: unknown;
  result?: unknown;
};

export type NcpCardPart = {
  type: "card";
  payload: Record<string, unknown>;
};

export type NcpRichTextPart = {
  type: "rich-text";
  format: "markdown" | "html" | "plain";
  text: string;
};

export type NcpActionPart = {
  type: "action";
  actionId: string;
  label: string;
  payload?: unknown;
};

export type NcpExtensionPart = {
  type: "extension";
  extensionType: string;
  data: unknown;
};

export type NcpMessagePart =
  | NcpTextPart
  | NcpFilePart
  | NcpSourcePart
  | NcpStepStartPart
  | NcpReasoningPart
  | NcpToolInvocationPart
  | NcpCardPart
  | NcpRichTextPart
  | NcpActionPart
  | NcpExtensionPart;

export type NcpMessage = {
  id: string;
  sessionKey: string;
  role: NcpMessageRole;
  status: NcpMessageStatus;
  parts: NcpMessagePart[];
  timestamp: string;
  metadata?: Record<string, unknown>;
};
