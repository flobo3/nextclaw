import { parseTimeToTimestampMs } from "./user-tool-helpers.js";

export function normalizeTaskTime(input?: { timestamp?: string; is_all_day?: boolean }) {
  if (!input) return undefined;
  const ts = parseTimeToTimestampMs(input.timestamp);
  if (!ts) {
    throw new Error("任务时间字段必须是带时区的 ISO 8601 / RFC 3339 时间。");
  }
  return { timestamp: ts, is_all_day: input.is_all_day ?? false };
}
