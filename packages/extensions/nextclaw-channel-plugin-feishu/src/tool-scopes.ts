export type ToolActionKey =
  | "feishu_get_user.default"
  | "feishu_search_user.default"
  | "feishu_calendar_calendar.list"
  | "feishu_calendar_calendar.get"
  | "feishu_calendar_calendar.primary"
  | "feishu_calendar_event.create"
  | "feishu_calendar_event.list"
  | "feishu_calendar_event.get"
  | "feishu_calendar_event.patch"
  | "feishu_calendar_event.delete"
  | "feishu_calendar_event.instance_view"
  | "feishu_calendar_event_attendee.create"
  | "feishu_calendar_event_attendee.list"
  | "feishu_calendar_freebusy.list"
  | "feishu_task_task.create"
  | "feishu_task_task.get"
  | "feishu_task_task.list"
  | "feishu_task_task.patch"
  | "feishu_task_tasklist.create"
  | "feishu_task_tasklist.get"
  | "feishu_task_tasklist.list"
  | "feishu_task_tasklist.tasks"
  | "feishu_task_tasklist.patch"
  | "feishu_task_tasklist.add_members"
  | "feishu_task_comment.create"
  | "feishu_task_comment.get"
  | "feishu_task_comment.list"
  | "feishu_task_subtask.create"
  | "feishu_task_subtask.list"
  | "feishu_sheet.info"
  | "feishu_sheet.read"
  | "feishu_sheet.write"
  | "feishu_sheet.append"
  | "feishu_sheet.find"
  | "feishu_sheet.create"
  | "feishu_sheet.export";

export const TOOL_SCOPES: Record<ToolActionKey, string[]> = {
  "feishu_get_user.default": ["contact:contact.base:readonly", "contact:user.base:readonly"],
  "feishu_search_user.default": ["contact:user:search"],
  "feishu_calendar_calendar.list": ["calendar:calendar:read"],
  "feishu_calendar_calendar.get": ["calendar:calendar:read"],
  "feishu_calendar_calendar.primary": ["calendar:calendar:read"],
  "feishu_calendar_event.create": [
    "calendar:calendar.event:create",
    "calendar:calendar.event:update",
  ],
  "feishu_calendar_event.list": ["calendar:calendar.event:read"],
  "feishu_calendar_event.get": ["calendar:calendar.event:read"],
  "feishu_calendar_event.patch": ["calendar:calendar.event:update"],
  "feishu_calendar_event.delete": ["calendar:calendar.event:delete"],
  "feishu_calendar_event.instance_view": ["calendar:calendar.event:read"],
  "feishu_calendar_event_attendee.create": ["calendar:calendar.event:update"],
  "feishu_calendar_event_attendee.list": ["calendar:calendar.event:read"],
  "feishu_calendar_freebusy.list": ["calendar:calendar.free_busy:read"],
  "feishu_task_task.create": ["task:task:write", "task:task:writeonly"],
  "feishu_task_task.get": ["task:task:read", "task:task:write"],
  "feishu_task_task.list": ["task:task:read", "task:task:write"],
  "feishu_task_task.patch": ["task:task:write", "task:task:writeonly"],
  "feishu_task_tasklist.create": ["task:tasklist:write"],
  "feishu_task_tasklist.get": ["task:tasklist:read", "task:tasklist:write"],
  "feishu_task_tasklist.list": ["task:tasklist:read", "task:tasklist:write"],
  "feishu_task_tasklist.tasks": ["task:tasklist:read", "task:tasklist:write"],
  "feishu_task_tasklist.patch": ["task:tasklist:write"],
  "feishu_task_tasklist.add_members": ["task:tasklist:write"],
  "feishu_task_comment.create": ["task:comment:write"],
  "feishu_task_comment.get": ["task:comment:read", "task:comment:write"],
  "feishu_task_comment.list": ["task:comment:read", "task:comment:write"],
  "feishu_task_subtask.create": ["task:task:write"],
  "feishu_task_subtask.list": ["task:task:read", "task:task:write"],
  "feishu_sheet.info": ["sheets:spreadsheet.meta:read", "sheets:spreadsheet:read"],
  "feishu_sheet.read": ["sheets:spreadsheet.meta:read", "sheets:spreadsheet:read"],
  "feishu_sheet.write": [
    "sheets:spreadsheet.meta:read",
    "sheets:spreadsheet:read",
    "sheets:spreadsheet:create",
    "sheets:spreadsheet:write_only",
  ],
  "feishu_sheet.append": [
    "sheets:spreadsheet.meta:read",
    "sheets:spreadsheet:read",
    "sheets:spreadsheet:create",
    "sheets:spreadsheet:write_only",
  ],
  "feishu_sheet.find": ["sheets:spreadsheet.meta:read", "sheets:spreadsheet:read"],
  "feishu_sheet.create": [
    "sheets:spreadsheet.meta:read",
    "sheets:spreadsheet:read",
    "sheets:spreadsheet:create",
    "sheets:spreadsheet:write_only",
  ],
  "feishu_sheet.export": ["docs:document:export"],
};

export function getRequiredScopes(toolAction: ToolActionKey): string[] {
  return TOOL_SCOPES[toolAction] ?? [];
}

export function getAllKnownScopes(): string[] {
  return Array.from(new Set(Object.values(TOOL_SCOPES).flat())).sort();
}
