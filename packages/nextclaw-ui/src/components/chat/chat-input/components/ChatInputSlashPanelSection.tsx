import type { MutableRefObject } from 'react';
import type { ChatInputBarSlashItem } from '@/components/chat/chat-input.types';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { t } from '@/lib/i18n';

type ChatInputSlashPanelSectionProps = {
  slashAnchorRef: MutableRefObject<HTMLDivElement | null>;
  slashListRef: MutableRefObject<HTMLDivElement | null>;
  isSlashPanelOpen: boolean;
  isSlashPanelLoading: boolean;
  resolvedSlashPanelWidth?: number;
  skillSlashItems: ChatInputBarSlashItem[];
  activeSlashIndex: number;
  activeSlashItem: ChatInputBarSlashItem | null;
  onSelectSlashItem: (item: ChatInputBarSlashItem) => void;
  onSlashPanelOpenChange: (open: boolean) => void;
  onSetActiveSlashIndex: (index: number) => void;
};

export function ChatInputSlashPanelSection({
  slashAnchorRef,
  slashListRef,
  isSlashPanelOpen,
  isSlashPanelLoading,
  resolvedSlashPanelWidth,
  skillSlashItems,
  activeSlashIndex,
  activeSlashItem,
  onSelectSlashItem,
  onSlashPanelOpenChange,
  onSetActiveSlashIndex
}: ChatInputSlashPanelSectionProps) {
  return (
    <Popover open={isSlashPanelOpen} onOpenChange={onSlashPanelOpenChange}>
      <PopoverAnchor asChild>
        <div ref={slashAnchorRef} className="pointer-events-none absolute left-3 right-3 bottom-full h-0" />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={10}
        className="z-[70] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-0 shadow-2xl backdrop-blur-md"
        onOpenAutoFocus={(event) => event.preventDefault()}
        style={resolvedSlashPanelWidth ? { width: `${resolvedSlashPanelWidth}px` } : undefined}
      >
        <div className="grid min-h-[240px] grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
          <div
            ref={slashListRef}
            className="max-h-[320px] overflow-y-auto border-r border-gray-200 p-2.5 custom-scrollbar"
          >
            {isSlashPanelLoading ? (
              <div className="p-2 text-xs text-gray-500">{t('chatSlashLoading')}</div>
            ) : (
              <>
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t('chatSlashSectionSkills')}
                </div>
                {skillSlashItems.length === 0 ? (
                  <div className="px-2 text-xs text-gray-400">{t('chatSlashNoResult')}</div>
                ) : (
                  <div className="space-y-1">
                    {skillSlashItems.map((item, index) => {
                      const isActive = index === activeSlashIndex;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          data-slash-index={index}
                          onMouseEnter={() => onSetActiveSlashIndex(index)}
                          onClick={() => onSelectSlashItem(item)}
                          className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                            isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate text-xs font-semibold">{item.title}</span>
                          <span className="truncate text-xs text-gray-500">{item.subtitle}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="max-w-[320px] p-3.5">
            {activeSlashItem ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {activeSlashItem.subtitle}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{activeSlashItem.title}</span>
                </div>
                <p className="text-xs leading-5 text-gray-600">{activeSlashItem.description}</p>
                <div className="space-y-1">
                  {activeSlashItem.detailLines.map((line) => (
                    <div key={line} className="rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="pt-1 text-[11px] text-gray-500">{t('chatSlashSkillHint')}</div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">{t('chatSlashHint')}</div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
