export function splitMarkdownFrontmatter(raw: string): { metadataRaw?: string; bodyRaw: string } {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { bodyRaw: normalized };
  }

  return {
    metadataRaw: match[1]?.trim() || undefined,
    bodyRaw: match[2] ?? ""
  };
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
