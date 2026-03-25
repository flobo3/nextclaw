import type { NcpMessagePart } from "@nextclaw/ncp";

export function MessagePart({ part }: { part: NcpMessagePart }) {
  if (part.type === "text") {
    return <p className="part-text">{part.text}</p>;
  }

  if (part.type === "reasoning") {
    return (
      <div className="part-reasoning-block">
        <div className="part-reasoning-label">thinking</div>
        <pre className="part-reasoning-text">{part.text}</pre>
      </div>
    );
  }

  if (part.type === "tool-invocation") {
    return (
      <div className="part-tool">
        <div>tool: {part.toolName}</div>
        <pre>{JSON.stringify({ args: part.args, result: part.result }, null, 2)}</pre>
      </div>
    );
  }

  if (part.type === "file" && part.contentBase64) {
    const dataUrl = `data:${part.mimeType ?? "application/octet-stream"};base64,${part.contentBase64}`;
    const isImage = (part.mimeType ?? "").startsWith("image/");
    return (
      <div className="part-file">
        {isImage ? (
          <img
            className="part-file-image"
            src={dataUrl}
            alt={part.name ?? "attachment"}
          />
        ) : null}
        <div className="part-file-meta">
          <div>{part.name ?? "attachment"}</div>
          <div className="ncp-ui-muted">{part.mimeType ?? "application/octet-stream"}</div>
        </div>
      </div>
    );
  }

  return <pre className="part-raw">{JSON.stringify(part, null, 2)}</pre>;
}
