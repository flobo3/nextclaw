import { cn } from '../../internal/cn';

type ChatMessageMetaProps = {
  roleLabel: string;
  timestampLabel: string;
  isUser: boolean;
};

export function ChatMessageMeta(props: ChatMessageMetaProps) {
  return (
    <div
      className={cn(
        'px-1 text-[11px] leading-4 text-gray-400',
        props.isUser ? 'text-right' : 'text-left'
      )}
    >
      {props.roleLabel} · {props.timestampLabel}
    </div>
  );
}
