import { useMemo, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ChatInputSnapshot } from '@/components/chat/stores/chat-input.store';
import type { NcpSessionListItemView } from '@/components/chat/ncp/use-ncp-session-list-view';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type ChatSidebarProjectGroup = {
  projectRoot: string;
  projectName: string;
  items: NcpSessionListItemView[];
  latestUpdatedAt: number;
};

type SessionTypeOption = ChatInputSnapshot['sessionTypeOptions'][number];

type ChatSidebarProjectGroupsProps = {
  groups: ChatSidebarProjectGroup[];
  defaultSessionType: string;
  sessionTypeOptions: SessionTypeOption[];
  renderSessionItem: (item: NcpSessionListItemView) => ReactNode;
  onCreateSession: (sessionType: string, projectRoot: string) => void;
};

function resolveProjectGroupDefaultSessionType(
  defaultSessionType: string,
  sessionTypeOptions: SessionTypeOption[]
): string {
  if (sessionTypeOptions.some((option) => option.value === defaultSessionType)) {
    return defaultSessionType;
  }
  return sessionTypeOptions[0]?.value ?? defaultSessionType;
}

function resolveSessionTypeStatusText(option: {
  ready?: boolean;
  reasonMessage?: string | null;
}): string {
  if (option.ready === false) {
    return option.reasonMessage?.trim() || t('statusSetup');
  }
  return t('statusReady');
}

export function ChatSidebarProjectGroups(props: ChatSidebarProjectGroupsProps) {
  const { groups, defaultSessionType, sessionTypeOptions, renderSessionItem, onCreateSession } = props;
  const [openProjectRoot, setOpenProjectRoot] = useState<string | null>(null);
  const preferredSessionType = useMemo(
    () => resolveProjectGroupDefaultSessionType(defaultSessionType, sessionTypeOptions),
    [defaultSessionType, sessionTypeOptions]
  );
  const supportsSessionTypeChoice = sessionTypeOptions.length > 1;

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const actionLabel = `${t('chatSidebarNewTask')} · ${group.projectName}`;

        return (
          <div key={group.projectRoot}>
            <div className="flex items-center justify-between gap-2 px-2 py-0.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <div
                  className="truncate text-[11px] font-medium uppercase tracking-wider text-gray-500"
                  title={group.projectRoot}
                >
                  {group.projectName}
                </div>
                <span className="shrink-0 text-[10px] text-gray-400">
                  {group.items.length}
                </span>
              </div>
              {supportsSessionTypeChoice ? (
                <Popover
                  open={openProjectRoot === group.projectRoot}
                  onOpenChange={(nextOpen) => {
                    setOpenProjectRoot(nextOpen ? group.projectRoot : null);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-lg text-gray-400 hover:bg-white hover:text-gray-900"
                      aria-label={actionLabel}
                      title={actionLabel}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-2">
                    <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      {t('chatSessionTypeLabel')}
                    </div>
                    <div className="mt-1 space-y-1">
                      {sessionTypeOptions.map((option) => (
                        <button
                          key={`${group.projectRoot}:${option.value}`}
                          type="button"
                          onClick={() => {
                            onCreateSession(option.value, group.projectRoot);
                            setOpenProjectRoot(null);
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-100"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[13px] font-medium text-gray-900">{option.label}</div>
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                option.ready === false
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-700'
                              )}
                            >
                              {option.ready === false ? t('statusSetup') : t('statusReady')}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-gray-500">
                            {resolveSessionTypeStatusText(option)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-lg text-gray-400 hover:bg-white hover:text-gray-900"
                  onClick={() => onCreateSession(preferredSessionType, group.projectRoot)}
                  aria-label={actionLabel}
                  title={actionLabel}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="space-y-0.5 pl-2">
              {group.items.map(renderSessionItem)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
