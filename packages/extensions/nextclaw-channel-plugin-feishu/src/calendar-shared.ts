import type { createToolContext } from "./user-tool-helpers.js";
import { assertLarkOk, unixTimestampToISO8601 } from "./user-tool-helpers.js";

export function normalizeEventTimes<T extends Record<string, unknown> | undefined>(event: T): T {
  if (!event) return event;
  const typed = event as Record<string, unknown>;
  const start = typed.start_time as { timestamp?: string | number } | undefined;
  const end = typed.end_time as { timestamp?: string | number } | undefined;
  return {
    ...typed,
    start_time_iso8601: unixTimestampToISO8601(start?.timestamp),
    end_time_iso8601: unixTimestampToISO8601(end?.timestamp),
  } as T;
}

export async function resolveCalendarId(
  client: ReturnType<typeof createToolContext>["toolClient"] extends () => infer T ? T : never,
  calendarId?: string,
) {
  if (calendarId) return calendarId;
  const response = await client.invoke(
    "feishu_calendar_calendar.primary",
    (sdk, opts) => sdk.calendar.calendar.primary({}, opts),
    { as: "user" },
  );
  assertLarkOk(response);
  const calendars = (response.data as { calendars?: Array<{ calendar_id?: string }> } | undefined)?.calendars;
  const primaryId = calendars?.[0]?.calendar_id;
  if (!primaryId) {
    throw new Error("No primary calendar found for current user.");
  }
  return primaryId;
}
