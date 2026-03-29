import fs from "node:fs";
import path from "node:path";

import {
  ROOT,
  isCodePath,
  normalizePath,
  runGit
} from "./maintainability-guard-support.mjs";

export const DIRECTORY_BUDGET_WARNING_COUNT = 12;
export const DIRECTORY_BUDGET_ERROR_COUNT = 20;
export const DIRECTORY_BUDGET_EXCEPTION_SECTION_TITLE = "## 目录预算豁免";
export const DIRECTORY_BUDGET_EXCEPTION_REQUIRED_FIELDS = ["原因"];

const DIRECTORY_BUDGET_EXCLUDED_PARTS = new Set([
  "__tests__",
  "tests",
  "__fixtures__",
  "fixtures",
  "generated",
  "migrations"
]);

function dirnamePosix(pathText) {
  const normalized = normalizePath(pathText);
  if (!normalized) {
    return "";
  }
  const parent = path.posix.dirname(normalized);
  return parent === "." ? "" : parent;
}

function shouldCheckDirectoryBudget(directoryPath) {
  const normalized = normalizePath(directoryPath);
  if (!normalized) {
    return false;
  }
  const parts = normalized.split("/").filter(Boolean);
  return !parts.some((part) => DIRECTORY_BUDGET_EXCLUDED_PARTS.has(part.toLowerCase()));
}

function listDirectCodeFilesInDirectory(directoryPath) {
  const normalized = normalizePath(directoryPath);
  if (!normalized || !shouldCheckDirectoryBudget(normalized)) {
    return [];
  }
  const absolutePath = path.resolve(ROOT, normalized);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    return [];
  }

  return fs.readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => normalizePath(path.posix.join(normalized, entry.name)))
    .filter((childPath) => childPath && isCodePath(childPath))
    .sort();
}

function listHeadDirectCodeFilesInDirectory(directoryPath) {
  const normalized = normalizePath(directoryPath);
  if (!normalized || !shouldCheckDirectoryBudget(normalized)) {
    return [];
  }

  const output = runGit(["ls-tree", "-r", "--name-only", "HEAD", "--", normalized], false);
  if (!output.trim()) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => filePath && path.posix.dirname(filePath) === normalized && isCodePath(filePath))
    .sort();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function inspectDirectoryBudgetExceptionText(readmeText) {
  const lines = `${readmeText ?? ""}`.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === DIRECTORY_BUDGET_EXCEPTION_SECTION_TITLE);

  if (headingIndex === -1) {
    return {
      found: false,
      missingFields: [...DIRECTORY_BUDGET_EXCEPTION_REQUIRED_FIELDS],
      reason: null
    };
  }

  const blockLines = [];
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s/.test(line)) {
      break;
    }
    blockLines.push(line);
  }

  const blockText = blockLines.join("\n");
  const reasonMatch = blockText.match(new RegExp(`^-\\s*${escapeRegExp(DIRECTORY_BUDGET_EXCEPTION_REQUIRED_FIELDS[0])}\\s*[:：]\\s*(.+)$`, "m"));

  return {
    found: true,
    missingFields: reasonMatch ? [] : [...DIRECTORY_BUDGET_EXCEPTION_REQUIRED_FIELDS],
    reason: reasonMatch ? reasonMatch[1].trim() : null
  };
}

function inspectDirectoryBudgetException(directoryPath) {
  const normalized = normalizePath(directoryPath);
  if (!normalized) {
    return {
      readmePath: null,
      found: false,
      missingFields: [...DIRECTORY_BUDGET_EXCEPTION_REQUIRED_FIELDS],
      reason: null
    };
  }

  const readmePath = `${normalized}/README.md`;
  const absoluteReadmePath = path.resolve(ROOT, readmePath);
  if (!fs.existsSync(absoluteReadmePath) || !fs.statSync(absoluteReadmePath).isFile()) {
    return {
      readmePath,
      found: false,
      missingFields: [...DIRECTORY_BUDGET_EXCEPTION_REQUIRED_FIELDS],
      reason: null
    };
  }

  const coverage = inspectDirectoryBudgetExceptionText(fs.readFileSync(absoluteReadmePath, "utf8"));
  return {
    readmePath,
    found: coverage.found,
    missingFields: coverage.missingFields,
    reason: coverage.reason
  };
}

function createDirectoryBudgetFinding(level, directoryPath, currentCount, previousCount, message, exception = null) {
  return {
    level,
    source: "directory-budget",
    path: directoryPath,
    category: "directory",
    budget: `${DIRECTORY_BUDGET_WARNING_COUNT}/${DIRECTORY_BUDGET_ERROR_COUNT}`,
    current_lines: null,
    previous_lines: null,
    delta_lines: null,
    message,
    suggested_seam: "split the directory by responsibility (for example components/store/service) before adding more direct files",
    current_count: currentCount,
    previous_count: previousCount,
    delta_count: previousCount == null ? null : currentCount - previousCount,
    exception_path: exception?.readmePath ?? null,
    exception_reason: exception?.reason ?? null
  };
}

export function evaluateDirectoryBudget(params) {
  const {
    directoryPath,
    currentCount,
    previousCount,
    exception
  } = params;

  if (currentCount < DIRECTORY_BUDGET_WARNING_COUNT) {
    return null;
  }

  const hasCompleteException = Boolean(exception?.found) && (exception?.missingFields?.length ?? 0) === 0;
  const previous = previousCount ?? 0;

  if (currentCount > DIRECTORY_BUDGET_ERROR_COUNT) {
    if (hasCompleteException) {
      return createDirectoryBudgetFinding(
        "warn",
        directoryPath,
        currentCount,
        previousCount,
        `directory exceeds hard file-count budget with a recorded exception in ${exception.readmePath}`,
        exception
      );
    }

    if (exception?.found) {
      return createDirectoryBudgetFinding(
        "error",
        directoryPath,
        currentCount,
        previousCount,
        `directory exceeds hard file-count budget and its exception note is incomplete; missing=${exception.missingFields.join(", ")}`,
        exception
      );
    }

    if (previous <= DIRECTORY_BUDGET_ERROR_COUNT) {
      return createDirectoryBudgetFinding(
        "error",
        directoryPath,
        currentCount,
        previousCount,
        "directory crossed from within budget to over the hard file-count limit without a recorded exception"
      );
    }

    return createDirectoryBudgetFinding(
      "warn",
      directoryPath,
      currentCount,
      previousCount,
      "directory remains over the hard file-count limit without a recorded exception"
    );
  }

  if (previousCount == null) {
    return createDirectoryBudgetFinding(
      "warn",
      directoryPath,
      currentCount,
      previousCount,
      "new directory starts above the review file-count budget"
    );
  }

  if (previous < DIRECTORY_BUDGET_WARNING_COUNT) {
    return createDirectoryBudgetFinding(
      "warn",
      directoryPath,
      currentCount,
      previousCount,
      "directory reached the review file-count budget; split by responsibility before it hardens into a dumping ground"
    );
  }

  if (currentCount > previous) {
    return createDirectoryBudgetFinding(
      "warn",
      directoryPath,
      currentCount,
      previousCount,
      "already crowded directory kept growing inside the review budget zone"
    );
  }

  return createDirectoryBudgetFinding(
    "warn",
    directoryPath,
    currentCount,
    previousCount,
    "touched directory remains above the review file-count budget"
  );
}

export function collectDirectoryBudgetFindings(paths) {
  const touchedDirectories = new Set();

  for (const rawPath of paths) {
    const directoryPath = dirnamePosix(rawPath);
    if (directoryPath) {
      touchedDirectories.add(directoryPath);
    }
  }

  return [...touchedDirectories]
    .sort()
    .map((directoryPath) => evaluateDirectoryBudget({
      directoryPath,
      currentCount: listDirectCodeFilesInDirectory(directoryPath).length,
      previousCount: (() => {
        const previousFiles = listHeadDirectCodeFilesInDirectory(directoryPath);
        return previousFiles.length === 0 ? 0 : previousFiles.length;
      })(),
      exception: inspectDirectoryBudgetException(directoryPath)
    }))
    .filter(Boolean);
}
