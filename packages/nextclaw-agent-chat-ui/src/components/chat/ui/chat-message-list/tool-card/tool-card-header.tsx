import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../../internal/cn';
import { ToolStatusLabel } from './tool-card-status';
import type { ChatToolPartViewModel } from '../../../view-models/chat-ui.types';

export function ToolCardHeader({ 
  card, 
  icon: Icon, 
  expanded, 
  canExpand,
  hideSummary = false,
  onToggle 
}: { 
  card: ChatToolPartViewModel; 
  icon: LucideIcon; 
  expanded: boolean; 
  canExpand: boolean;
  hideSummary?: boolean;
  onToggle: () => void; 
}) {
  const summaryPart = hideSummary
    ? ''
    : card.summary?.replace(/^(command|path|args|query|input):\s*/i, '') ?? '';

  return (
    <div 
      className={cn(
        "flex items-center justify-between px-3 py-2.5 transition-colors bg-transparent", 
        canExpand ? "cursor-pointer hover:bg-amber-100/30" : ""
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 font-mono min-w-0 max-w-[calc(100%-80px)] text-amber-950/80">
        <Icon className="h-4 w-4 text-amber-600/80 shrink-0" strokeWidth={3} />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold shrink-0 tracking-tight">{card.toolName}</span>
          {summaryPart && (
            <>
              <span className="text-amber-300 font-bold select-none shrink-0">›</span>
              <span className="truncate flex-1 min-w-0 font-normal" title={summaryPart}>
                {summaryPart}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <ToolStatusLabel card={card} />
        {canExpand && (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-amber-400/80" strokeWidth={3} />
          ) : (
            <ChevronRight className="h-4 w-4 text-amber-400/80" strokeWidth={3} />
          )
        )}
      </div>
    </div>
  );
}
