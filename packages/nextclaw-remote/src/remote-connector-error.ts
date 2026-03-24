const TERMINAL_REMOTE_ERROR_PATTERNS = [
  /invalid or expired token/i,
  /missing bearer token/i,
  /token expired/i,
  /token is invalid/i,
  /run "nextclaw login"/i,
  /replaced by a newer connector session/i,
  /already owned by (?:running )?nextclaw service/i,
  /already owned by local nextclaw process/i,
  /unexpected server response:\s*400/i,
  /unexpected server response:\s*401/i,
  /unexpected server response:\s*403/i,
  /unexpected server response:\s*404/i,
  /invalid url/i,
  /unsupported protocol/i
];

export function isTerminalRemoteConnectorError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TERMINAL_REMOTE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function describeUnexpectedRemoteConnectorClose(event: {
  code?: unknown;
  reason?: unknown;
  wasClean?: unknown;
}): string | null {
  const code = typeof event.code === "number" && Number.isFinite(event.code) ? event.code : null;
  const reason = typeof event.reason === "string" ? event.reason.trim() : "";
  const wasClean = typeof event.wasClean === "boolean" ? event.wasClean : null;

  if ((code === null || code === 1000) && !reason) {
    return null;
  }

  const detailParts: string[] = [];
  if (code !== null) {
    detailParts.push(`code ${code}`);
  }
  if (wasClean !== null) {
    detailParts.push(wasClean ? "clean" : "unclean");
  }

  const detail = detailParts.length > 0 ? ` (${detailParts.join(", ")})` : "";
  if (reason) {
    return `Remote connector websocket closed${detail}: ${reason}`;
  }
  return `Remote connector websocket closed${detail}.`;
}
