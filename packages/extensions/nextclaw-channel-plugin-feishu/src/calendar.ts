import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { listEnabledFeishuAccounts } from "./accounts.js";
import { registerFeishuCalendarCalendarTool } from "./calendar-calendar.js";
import { registerFeishuCalendarEventTool } from "./calendar-event.js";
import { registerFeishuCalendarEventAttendeeTool } from "./calendar-event-attendee.js";
import { registerFeishuCalendarFreebusyTool } from "./calendar-freebusy.js";
import { resolveAnyEnabledFeishuToolsConfig } from "./tool-account.js";

export function registerFeishuCalendarTools(api: OpenClawPluginApi) {
  if (!api.config) return;
  const accounts = listEnabledFeishuAccounts(api.config);
  if (accounts.length === 0) return;
  if (!resolveAnyEnabledFeishuToolsConfig(accounts).calendar) return;
  registerFeishuCalendarCalendarTool(api);
  registerFeishuCalendarEventTool(api);
  registerFeishuCalendarEventAttendeeTool(api);
  registerFeishuCalendarFreebusyTool(api);
}
