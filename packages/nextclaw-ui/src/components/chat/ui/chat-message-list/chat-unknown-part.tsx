type ChatUnknownPartProps = {
  label: string;
  rawType: string;
  text?: string;
};

export function ChatUnknownPart(props: ChatUnknownPartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-600">
      <div className="font-semibold text-gray-700">
        {props.label}: {props.rawType}
      </div>
      {props.text ? <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] text-gray-500">{props.text}</pre> : null}
    </div>
  );
}
