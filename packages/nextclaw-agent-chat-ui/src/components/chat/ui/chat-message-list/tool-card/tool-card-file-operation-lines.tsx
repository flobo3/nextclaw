import type {
  ChatFileOperationBlockViewModel,
  ChatFileOperationLineViewModel,
} from "../../../view-models/chat-ui.types";
import { cn } from "../../../internal/cn";
import type { CSSProperties } from "react";

const FILE_ROW_CLASS_NAME = "h-5 font-mono text-[11px] leading-5";
const FILE_GUTTER_NUMBER_CELL_CLASS_NAME =
  "sticky left-0 z-[1] flex h-5 items-center justify-center px-2.5 tabular-nums select-none";

function formatLineNumber(value?: number): string {
  return typeof value === "number" ? String(value) : "";
}

function readVisibleLineNumber(line: ChatFileOperationLineViewModel): string {
  return formatLineNumber(line.newLineNumber ?? line.oldLineNumber);
}

function readLineKey(
  prefix: string,
  line: ChatFileOperationLineViewModel,
  index: number,
): string {
  return `${prefix}-${index}-${line.oldLineNumber ?? "x"}-${line.newLineNumber ?? "x"}`;
}

function hasVisibleLineNumber(line: ChatFileOperationLineViewModel): boolean {
  return (
    typeof line.newLineNumber === "number" ||
    typeof line.oldLineNumber === "number"
  );
}

function readHasBlockLineNumbers(
  block: ChatFileOperationBlockViewModel,
): boolean {
  return block.lines.some(hasVisibleLineNumber);
}

function readLineNumberColumnWidth(
  block: ChatFileOperationBlockViewModel,
): string {
  const maxDigits = block.lines.reduce((currentMax, line) => {
    if (!hasVisibleLineNumber(line)) {
      return currentMax;
    }
    return Math.max(currentMax, readVisibleLineNumber(line).length);
  }, 0);
  const width = Math.max(6.5, Math.min(8, maxDigits + 3.5));
  return `${width}ch`;
}

function buildRowTemplateColumns(params: {
  showLineNumbers: boolean;
  lineNumberColumnWidth: string;
}): CSSProperties | undefined {
  if (!params.showLineNumbers) {
    return undefined;
  }
  return {
    gridTemplateColumns: `${params.lineNumberColumnWidth} minmax(0, 1fr)`,
  };
}

function getLineNumberTone(line: ChatFileOperationLineViewModel): string {
  if (line.kind === "remove") {
    return "border-r border-rose-200 bg-rose-50 text-rose-700";
  }
  if (line.kind === "add") {
    return "border-r border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-r border-stone-200 bg-stone-100 text-stone-500";
}

function getCodeRowTone(line: ChatFileOperationLineViewModel): string {
  if (line.kind === "remove") {
    return "bg-rose-50 text-rose-950";
  }
  if (line.kind === "add") {
    return "bg-emerald-50 text-emerald-950";
  }
  return "bg-white text-amber-950/80";
}

function FileOperationLineRow({
  line,
  showLineNumbers,
  lineNumberColumnWidth,
}: {
  line: ChatFileOperationLineViewModel;
  showLineNumbers: boolean;
  lineNumberColumnWidth: string;
}) {
  return (
    <div
      data-file-line-row="true"
      className={cn("grid w-max min-w-full", FILE_ROW_CLASS_NAME)}
      style={buildRowTemplateColumns({
        showLineNumbers,
        lineNumberColumnWidth,
      })}
    >
      {showLineNumbers ? (
        <span
          data-file-line-number-cell="true"
          style={{ width: lineNumberColumnWidth }}
          className={cn(
            FILE_GUTTER_NUMBER_CELL_CLASS_NAME,
            getLineNumberTone(line),
          )}
        >
          {readVisibleLineNumber(line)}
        </span>
      ) : null}
      <span
        data-file-code-row="true"
        className={cn(
          "block min-w-full whitespace-pre px-2.5",
          getCodeRowTone(line),
        )}
      >
        {line.text || " "}
      </span>
    </div>
  );
}

export function FileOperationLinesGrid({
  block,
}: {
  block: ChatFileOperationBlockViewModel;
}) {
  const showLineNumbers = readHasBlockLineNumbers(block);
  const lineNumberColumnWidth = readLineNumberColumnWidth(block);

  return (
    <div className="overflow-x-auto custom-scrollbar-amber bg-white">
      {block.lines.map((line, index) => (
        <FileOperationLineRow
          key={readLineKey("row", line, index)}
          line={line}
          showLineNumbers={showLineNumbers}
          lineNumberColumnWidth={lineNumberColumnWidth}
        />
      ))}
    </div>
  );
}
