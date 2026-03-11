export type NcpErrorCode = "config_error" | "auth_error" | "runtime_error" | "timeout_error" | "abort_error";

export type NcpError = {
  code: NcpErrorCode;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
};

export class NcpErrorException extends Error {
  constructor(
    public readonly code: NcpErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "NcpErrorException";
  }
}
