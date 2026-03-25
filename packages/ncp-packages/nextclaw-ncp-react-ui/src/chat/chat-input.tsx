import { useRef } from "react";

type ChatInputAttachment = {
  id: string;
  name: string;
  mimeType: string;
};

type ChatInputProps = {
  value: string;
  attachments?: readonly ChatInputAttachment[];
  attachmentAccept?: string;
  placeholder?: string;
  isSending: boolean;
  sendDisabled: boolean;
  isRunning: boolean;
  onChange: (value: string) => void;
  onFilesAdd?: (files: File[]) => Promise<void> | void;
  onAttachmentRemove?: (attachmentId: string) => void;
  onSend: () => void;
  onAbort?: () => void;
};

export function ChatInput({
  value,
  attachments = [],
  attachmentAccept,
  placeholder = "Ask anything.",
  isSending,
  sendDisabled,
  isRunning,
  onChange,
  onFilesAdd,
  onAttachmentRemove,
  onSend,
  onAbort,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const showAbort = isRunning && Boolean(onAbort);
  const hasContent = value.trim().length > 0 || attachments.length > 0;

  return (
    <footer className="composer">
      {attachments.length > 0 ? (
        <div className="composer-attachments">
          {attachments.map((attachment) => (
            <button
              key={attachment.id}
              className="composer-attachment-chip"
              type="button"
              onClick={() => onAttachmentRemove?.(attachment.id)}
            >
              <span className="composer-attachment-chip-label">{attachment.name}</span>
              <span className="composer-attachment-chip-remove">x</span>
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData.files ?? []);
          if (files.length === 0 || !onFilesAdd) {
            return;
          }
          event.preventDefault();
          void onFilesAdd(files);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) {
            return;
          }
          event.preventDefault();
          if (showAbort) {
            void onAbort?.();
            return;
          }
          void onSend();
        }}
      />
      {showAbort ? (
        <button
          className="ncp-ui-button ncp-ui-button-danger"
          type="button"
          onClick={onAbort}
        >
          stop
        </button>
      ) : (
        <div className="composer-actions">
          {onFilesAdd ? (
            <>
              <button
                className="ncp-ui-button ncp-ui-button-ghost"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendDisabled}
              >
                attach
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={attachmentAccept}
                multiple
                className="composer-file-input"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.currentTarget.value = "";
                  void onFilesAdd(files);
                }}
              />
            </>
          ) : null}
          <button
            className="ncp-ui-button"
            type="button"
            onClick={onSend}
            disabled={sendDisabled || !hasContent}
          >
            {isSending ? "running..." : "send"}
          </button>
        </div>
      )}
    </footer>
  );
}
