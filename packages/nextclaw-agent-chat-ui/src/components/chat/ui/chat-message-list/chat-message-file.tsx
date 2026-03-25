type ChatMessageFileProps = {
  file: {
    label: string;
    mimeType: string;
    dataUrl?: string;
    isImage: boolean;
  };
};

export function ChatMessageFile({ file }: ChatMessageFileProps) {
  if (file.isImage && file.dataUrl) {
    return (
      <figure className="overflow-hidden rounded-2xl border border-black/8 bg-black/6">
        <img src={file.dataUrl} alt={file.label} className="block max-h-80 w-full object-contain" />
        <figcaption className="border-t border-black/8 px-3 py-2 text-xs opacity-80">{file.label}</figcaption>
      </figure>
    );
  }

  return (
    <div className="rounded-2xl border border-black/8 bg-black/6 px-3 py-2 text-sm">
      <div className="font-medium">{file.label}</div>
      <div className="text-xs opacity-75">{file.mimeType}</div>
    </div>
  );
}
