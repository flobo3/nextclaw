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
  const showAbort = isRunning && onAbort;

  return (
    <footer className="composer">
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (showAbort) {
              void onAbort?.();
            } else {
              void onSend();
            }
          }
        }}
      />
      {showAbort ? (
        <button className="danger" onClick={onAbort}>
          stop
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={sendDisabled || value.trim().length === 0}
        >
          {isSending ? "running..." : "send"}
        </button>
      )}
    </footer>
  );
}
