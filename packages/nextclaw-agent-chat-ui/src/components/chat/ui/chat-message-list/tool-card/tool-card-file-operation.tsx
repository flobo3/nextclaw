import type {
  ChatFileOperationBlockViewModel,
  ChatFileOperationLineViewModel,
  ChatToolPartViewModel,
} from "../../../view-models/chat-ui.types";
import { cn } from "../../../internal/cn";
import { Fragment } from "react";
import { ChatUiPrimitives } from "../../primitives/chat-ui-primitives";

function formatLineNumber(value?: number): string {
  return typeof value === "number" ? String(value) : "";
}

function readVisibleLineNumber(line: ChatFileOperationLineViewModel): string {
  return formatLineNumber(line.newLineNumber ?? line.oldLineNumber);
}

function isPreviewBlock(block: ChatFileOperationBlockViewModel): boolean {
  return block.display === "preview";
}

function getCaptionTone(part: string): string {
  if (/^\+\d+$/.test(part)) {
    return "text-emerald-700";
  }
  if (/^-\d+$/.test(part)) {
    return "text-rose-700";
  }
  return "text-stone-500";
}

function renderCaption(caption: string) {
  const parts = caption
    .split("·")
    .map((part) => part.trim())
    .filter((part) => /^\+\d+$/.test(part) || /^-\d+$/.test(part));
  if (parts.length === 0) {
    return null;
  }
  return (
    <div className="flex shrink-0 items-center gap-x-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em]">
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 ? (
            <span className="text-stone-300">·</span>
          ) : null}
          <span className={cn(getCaptionTone(part))}>
            {part}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function renderDiffGutterRow(
  line: ChatFileOperationLineViewModel,
  index: number,
) {
  const gutterTone =
    line.kind === "add"
      ? "border-r border-emerald-200 bg-emerald-100 text-emerald-700"
      : line.kind === "remove"
        ? "border-r border-rose-200 bg-rose-100 text-rose-700"
        : "border-r border-stone-200 bg-stone-100 text-stone-500";

  return (
    <div
      key={`diff-gutter-${index}-${line.oldLineNumber ?? "x"}-${line.newLineNumber ?? "x"}`}
      className="font-mono text-[11px] leading-relaxed"
    >
      <span className={cn("flex h-full w-11 items-center justify-center px-1 py-1 tabular-nums", gutterTone)}>
        {readVisibleLineNumber(line)}
      </span>
    </div>
  );
}

function renderPreviewGutterRow(
  line: ChatFileOperationLineViewModel,
  index: number,
) {
  return (
    <div
      key={`preview-gutter-${index}-${line.oldLineNumber ?? "x"}-${line.newLineNumber ?? "x"}`}
      className="font-mono text-[11px] leading-relaxed"
    >
      <span className="flex h-full w-11 items-center justify-center border-r border-stone-200 bg-stone-100 px-1 py-1.5 tabular-nums text-stone-500">
        {readVisibleLineNumber(line)}
      </span>
    </div>
  );
}

function renderDiffCodeRow(
  line: ChatFileOperationLineViewModel,
  index: number,
) {
  const rowTone =
    line.kind === "add"
      ? "border-l-2 border-emerald-300 bg-emerald-50 text-emerald-950"
      : line.kind === "remove"
        ? "border-l-2 border-rose-300 bg-rose-50 text-rose-950"
        : "border-l-2 border-transparent text-amber-950/80";

  return (
    <div
      key={`diff-code-${index}-${line.oldLineNumber ?? "x"}-${line.newLineNumber ?? "x"}`}
      className={cn(
        "min-w-full whitespace-pre px-3 py-1 font-mono text-[11px] leading-relaxed",
        rowTone,
      )}
    >
      {line.text || " "}
    </div>
  );
}

function renderPreviewCodeRow(
  line: ChatFileOperationLineViewModel,
  index: number,
) {
  return (
    <div
      key={`preview-code-${index}-${line.oldLineNumber ?? "x"}-${line.newLineNumber ?? "x"}`}
      className="min-w-full whitespace-pre px-3 py-1.5 font-mono text-[11px] leading-relaxed text-amber-950/85"
    >
      {line.text || " "}
    </div>
  );
}

function FileOperationBlock({
  block,
  showPathRow,
  isFirst,
}: {
  block: ChatFileOperationBlockViewModel;
  showPathRow: boolean;
  isFirst: boolean;
}) {
  const { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } = ChatUiPrimitives;
  const previewBlock = isPreviewBlock(block);
  const showMetaRow = showPathRow || Boolean(block.caption);

  return (
    <section className={cn("overflow-hidden bg-white", !isFirst && "border-t border-stone-200/80")}>
      {showMetaRow ? (
        <div
          className={cn(
            "flex items-center justify-between gap-4 border-b border-stone-200/80 px-4 text-stone-700",
            showPathRow ? "py-3" : "py-2",
          )}
        >
          <div className="min-w-0 flex-1">
            {showPathRow ? (
              <TooltipProvider delayDuration={250}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="truncate whitespace-nowrap font-mono text-[12px] font-medium text-stone-700"
                      title={block.path}
                    >
                      {block.path}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[420px] text-xs font-mono break-all">
                    {block.path}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          {block.caption ? renderCaption(block.caption) : null}
        </div>
      ) : null}

      {block.lines.length > 0 ? (
        <div className="max-h-72 overflow-auto bg-white custom-scrollbar-amber">
          <div
            className={cn(
              "grid min-w-0 max-w-full",
              "grid-cols-[2.75rem_minmax(0,1fr)]",
            )}
          >
            <div className="overflow-hidden">
              {block.lines.map(previewBlock ? renderPreviewGutterRow : renderDiffGutterRow)}
            </div>
            <div className="overflow-x-auto custom-scrollbar-amber bg-white">
              <div className="min-w-max">
                {block.lines.map(previewBlock ? renderPreviewCodeRow : renderDiffCodeRow)}
              </div>
            </div>
          </div>
        </div>
      ) : block.rawText ? (
        <pre className="max-h-72 min-w-full w-max overflow-auto bg-white px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-950/80 whitespace-pre custom-scrollbar-amber">
          {block.rawText}
        </pre>
      ) : null}

      {block.truncated && !previewBlock ? (
        <div className="border-t border-stone-200/85 bg-stone-50 px-4 py-2 text-[10px] text-stone-500">
          Showing a shortened diff preview.
        </div>
      ) : null}
    </section>
  );
}

export function ToolCardFileOperationContent({
  card,
  className,
}: {
  card: ChatToolPartViewModel;
  className?: string;
}) {
  const blocks = card.fileOperation?.blocks ?? [];
  const output = card.output?.trim() ?? "";
  if (blocks.length === 0 && !output) {
    return null;
  }

  return (
    <div className={cn("overflow-hidden bg-white", className)}>
      {blocks.map((block, index) => {
        return (
          <FileOperationBlock
            key={block.key}
            block={block}
            showPathRow={true}
            isFirst={index === 0}
          />
        );
      })}

      {output ? (
        <pre className={cn(
          "max-h-56 min-w-full w-max overflow-auto bg-white px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-950/80 whitespace-pre custom-scrollbar-amber",
          blocks.length > 0 && "border-t border-stone-200/80",
        )}>
          {output}
        </pre>
      ) : null}
    </div>
  );
}
