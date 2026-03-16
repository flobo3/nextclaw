type ChatInputProps = {
  value: string;
  placeholder?: string;
  isSending: boolean;
  sendDisabled: boolean;
  isRunning: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort?: () => void;
};

export function ChatInput({
  value,
  placeholder = "Ask anything.",
  isSending,
  sendDisabled,
  isRunning,
  onChange,
  onSend,
  onAbort,
}: ChatInputProps) {
  const showAbort = isRunning && Boolean(onAbort);

  return (
    <footer className="composer">
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
        <button
          className="ncp-ui-button"
          type="button"
          onClick={onSend}
          disabled={sendDisabled || value.trim().length === 0}
        >
          {isSending ? "running..." : "send"}
        </button>
      )}
    </footer>
  );
}
