export type EndpointKind = "agent" | "platform" | "email" | "human" | "custom";

export type EndpointLatency = "realtime" | "seconds" | "minutes" | "hours" | "days";

export type EndpointSharedLevel = "minimal" | "partial" | "full";

export type EndpointManifest = {
  endpointKind: EndpointKind;
  endpointId: string;
  version: string;
  supportsStreaming: boolean;
  supportsAbort: boolean;
  supportsProactiveMessages: boolean;
  supportsSessionResume: boolean;
  supportedPartTypes: string[];
  expectedLatency: EndpointLatency;
  sharedLevel?: EndpointSharedLevel;
  metadata?: Record<string, unknown>;
};
