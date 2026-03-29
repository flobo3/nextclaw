import { spawnSync } from "node:child_process";

import { FUNCTION_RULE_IDS, ROOT } from "./maintainability-guard-support.mjs";

const SYMBOL_NAME_PATTERN = /(?:Async method|Method|Function) '([^']+)'/;
const PARENTHESIZED_NUMBER_PATTERN = /\((\d+)\)/;
const COGNITIVE_COMPLEXITY_PATTERN = /from (\d+)/;

function parseMetricValue(ruleId, message) {
  if (ruleId === "sonarjs/cognitive-complexity") {
    const match = message.match(COGNITIVE_COMPLEXITY_PATTERN);
    return match ? Number(match[1]) : null;
  }
  const match = message.match(PARENTHESIZED_NUMBER_PATTERN);
  return match ? Number(match[1]) : null;
}

function parseSymbolName(message) {
  const match = message.match(SYMBOL_NAME_PATTERN);
  return match ? match[1] : null;
}

export function lintContent(pathText, content) {
  const result = spawnSync("pnpm", ["exec", "eslint", "--stdin", "--stdin-filename", pathText, "--format", "json"], {
    cwd: ROOT,
    input: content,
    encoding: "utf8"
  });

  if (!(result.stdout || "").trim()) {
    if (result.status === 0) {
      return [];
    }
    throw new Error((result.stderr || "").trim() || `eslint failed for ${pathText}`);
  }

  const payload = JSON.parse(result.stdout);
  if (!Array.isArray(payload) || payload.length === 0) {
    return [];
  }

  return (payload[0].messages || [])
    .filter((message) => FUNCTION_RULE_IDS.has(message.ruleId))
    .map((message) => ({
      ruleId: message.ruleId,
      message: message.message || "",
      line: Number(message.line || 0),
      endLine: Number(message.endLine || message.line || 0),
      nodeType: message.nodeType || null,
      symbolName: parseSymbolName(message.message || ""),
      metricValue: parseMetricValue(message.ruleId, message.message || "")
    }));
}

export function buildSignature(finding) {
  if (!finding.symbolName) {
    return null;
  }
  return `${finding.ruleId}::${finding.symbolName}`;
}
