import type { AgentSessionRecord } from "@nextclaw/ncp-toolkit";
import { extractTextFromNcpMessage, normalizeString } from "../nextclaw-ncp-message-bridge.js";
import type { SessionSearchDocument } from "./session-search.types.js";
import type { SessionSearchStoreService } from "./session-search-store.service.js";

const AUTO_LABEL_MAX_LENGTH = 64;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function truncateLabel(value: string): string {
  const characters = Array.from(value);
  if (characters.length <= AUTO_LABEL_MAX_LENGTH) {
    return value;
  }
  return `${characters.slice(0, AUTO_LABEL_MAX_LENGTH).join("")}…`;
}

function resolveSessionLabel(session: AgentSessionRecord): string {
  const metadataLabel =
    normalizeString(session.metadata?.label) ??
    normalizeString(session.metadata?.session_label);
  if (metadataLabel) {
    return metadataLabel;
  }

  for (const message of session.messages) {
    if (message.role !== "user") {
      continue;
    }
    const text = normalizeString(extractTextFromNcpMessage(message));
    if (text) {
      return truncateLabel(text);
    }
  }

  return "";
}

function buildSearchableContent(session: AgentSessionRecord): string {
  const lines: string[] = [];
  for (const message of session.messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }
    const text = normalizeString(extractTextFromNcpMessage(message));
    if (!text) {
      continue;
    }
    lines.push(`${message.role}: ${normalizeWhitespace(text)}`);
  }
  return lines.join("\n");
}

export class SessionSearchIndexManager {
  constructor(private readonly store: SessionSearchStoreService) {}

  indexSession = async (session: AgentSessionRecord): Promise<void> => {
    const document = this.buildDocument(session);
    if (!document) {
      await this.store.deleteDocument(session.sessionId);
      return;
    }
    await this.store.upsertDocument(document);
  };

  private buildDocument(session: AgentSessionRecord): SessionSearchDocument | null {
    const label = resolveSessionLabel(session);
    const content = buildSearchableContent(session);
    if (!label && !content) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      label,
      content,
      updatedAt: session.updatedAt,
    };
  }
}
