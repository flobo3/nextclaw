import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { normalizeEventTimes, resolveCalendarId } from "./calendar-shared.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, parseTimeToTimestamp, registerTool, StringEnum } from "./user-tool-helpers.js";

const CalendarEventSchema = Type.Union([
  Type.Object({
    action: Type.Literal("create"),
    start_time: Type.String(),
    end_time: Type.String(),
    summary: Type.Optional(Type.String()),
    calendar_id: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    attendees: Type.Optional(Type.Array(Type.Object({ type: StringEnum(["user", "chat", "resource", "third_party"]), id: Type.String() }))),
    user_open_id: Type.Optional(Type.String()),
    need_notification: Type.Optional(Type.Boolean()),
    location: Type.Optional(Type.String()),
  }),
  Type.Object({
    action: Type.Literal("list"),
    start_time: Type.String(),
    end_time: Type.String(),
    calendar_id: Type.Optional(Type.String()),
    page_size: Type.Optional(Type.Number()),
    page_token: Type.Optional(Type.String()),
  }),
  Type.Object({ action: Type.Literal("get"), event_id: Type.String(), calendar_id: Type.Optional(Type.String()) }),
  Type.Object({
    action: Type.Literal("patch"),
    event_id: Type.String(),
    calendar_id: Type.Optional(Type.String()),
    summary: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    start_time: Type.Optional(Type.String()),
    end_time: Type.Optional(Type.String()),
    location: Type.Optional(Type.String()),
  }),
  Type.Object({ action: Type.Literal("delete"), event_id: Type.String(), calendar_id: Type.Optional(Type.String()), need_notification: Type.Optional(Type.Boolean()) }),
]);

function buildAttendees(payload: {
  attendees?: Array<{ type: "user" | "chat" | "resource" | "third_party"; id: string }>;
  user_open_id?: string;
}) {
  const attendees = [
    ...(payload.user_open_id ? [{ type: "user" as const, id: payload.user_open_id }] : []),
    ...(payload.attendees ?? []),
  ];
  return attendees.map((attendee) => {
    if (attendee.type === "user") return { type: attendee.type, user_id: attendee.id };
    if (attendee.type === "chat") return { type: attendee.type, chat_id: attendee.id };
    if (attendee.type === "resource") return { type: attendee.type, room_id: attendee.id };
    return { type: attendee.type, third_party_email: attendee.id };
  });
}

export function registerFeishuCalendarEventTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_calendar_event");
  registerTool(
    api,
    {
      name: "feishu_calendar_event",
      label: "Feishu Calendar Event",
      description: "按本人身份创建、查询、修改、删除飞书日程。",
      parameters: CalendarEventSchema,
      async execute(_toolCallId, params) {
        const payload = params as {
          action: "create" | "list" | "get" | "patch" | "delete";
          calendar_id?: string;
          event_id?: string;
          start_time?: string;
          end_time?: string;
          summary?: string;
          description?: string;
          attendees?: Array<{ type: "user" | "chat" | "resource" | "third_party"; id: string }>;
          user_open_id?: string;
          need_notification?: boolean;
          location?: string;
          page_size?: number;
          page_token?: string;
        };
        try {
          const client = toolClient();
          const calendarId = await resolveCalendarId(client, payload.calendar_id);

          if (payload.action === "create") {
            const startTs = payload.start_time ? parseTimeToTimestamp(payload.start_time) : null;
            const endTs = payload.end_time ? parseTimeToTimestamp(payload.end_time) : null;
            if (!startTs || !endTs) {
              return json({ error: "start_time 和 end_time 必须为带时区的 ISO 8601 / RFC 3339 时间。" });
            }
            const response = await client.invoke(
              "feishu_calendar_event.create",
              (sdk, opts) =>
                sdk.calendar.calendarEvent.create(
                  {
                    path: { calendar_id: calendarId },
                    data: {
                      summary: payload.summary,
                      description: payload.description,
                      start_time: { timestamp: startTs },
                      end_time: { timestamp: endTs },
                      ...(payload.location ? { location: { name: payload.location } } : {}),
                    },
                  },
                  opts,
                ),
              { as: "user" },
            );
            assertLarkOk(response);
            const event = (response.data as { event?: { event_id?: string } } | undefined)?.event;
            const attendeePayload = buildAttendees(payload);
            if (event?.event_id && attendeePayload.length > 0) {
              await client.invoke(
                "feishu_calendar_event.create",
                (sdk, opts) =>
                  sdk.calendar.calendarEventAttendee.create(
                    {
                      path: { calendar_id: calendarId, event_id: event.event_id! },
                      params: { user_id_type: "open_id" as never },
                      data: {
                        attendees: attendeePayload,
                        need_notification: payload.need_notification ?? true,
                      },
                    },
                    opts,
                  ),
                { as: "user" },
              );
            }
            return json({ event: normalizeEventTimes((response.data as { event?: Record<string, unknown> } | undefined)?.event) });
          }

          if (payload.action === "list") {
            const startTs = payload.start_time ? parseTimeToTimestamp(payload.start_time) : null;
            const endTs = payload.end_time ? parseTimeToTimestamp(payload.end_time) : null;
            if (!startTs || !endTs) {
              return json({ error: "start_time 和 end_time 必须为带时区的 ISO 8601 / RFC 3339 时间。" });
            }
            const response = await client.invoke(
              "feishu_calendar_event.instance_view",
              (sdk, opts) =>
                sdk.calendar.calendarEvent.instanceView(
                  {
                    path: { calendar_id: calendarId },
                    params: {
                      start_time: startTs,
                      end_time: endTs,
                      page_size: payload.page_size,
                      page_token: payload.page_token,
                      user_id_type: "open_id" as never,
                    },
                  },
                  opts,
                ),
              { as: "user" },
            );
            assertLarkOk(response);
            const items =
              ((response.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []).map(
                normalizeEventTimes,
              );
            return json({
              events: items,
              has_more: (response.data as { has_more?: boolean } | undefined)?.has_more ?? false,
              page_token: (response.data as { page_token?: string } | undefined)?.page_token,
            });
          }

          if (payload.action === "get") {
            const response = await client.invoke(
              "feishu_calendar_event.get",
              (sdk, opts) =>
                sdk.calendar.calendarEvent.get(
                  { path: { calendar_id: calendarId, event_id: payload.event_id! } },
                  opts,
                ),
              { as: "user" },
            );
            assertLarkOk(response);
            return json({ event: normalizeEventTimes((response.data as { event?: Record<string, unknown> } | undefined)?.event) });
          }

          if (payload.action === "patch") {
            const updateData: Record<string, unknown> = {};
            if (payload.summary) updateData.summary = payload.summary;
            if (payload.description) updateData.description = payload.description;
            if (payload.location) updateData.location = { name: payload.location };
            if (payload.start_time) {
              const startTs = parseTimeToTimestamp(payload.start_time);
              if (!startTs) return json({ error: "start_time 必须为带时区的 ISO 8601 / RFC 3339 时间。" });
              updateData.start_time = { timestamp: startTs };
            }
            if (payload.end_time) {
              const endTs = parseTimeToTimestamp(payload.end_time);
              if (!endTs) return json({ error: "end_time 必须为带时区的 ISO 8601 / RFC 3339 时间。" });
              updateData.end_time = { timestamp: endTs };
            }
            const response = await client.invoke(
              "feishu_calendar_event.patch",
              (sdk, opts) =>
                sdk.calendar.calendarEvent.patch(
                  {
                    path: { calendar_id: calendarId, event_id: payload.event_id! },
                    data: updateData,
                  },
                  opts,
                ),
              { as: "user" },
            );
            assertLarkOk(response);
            return json({ event: normalizeEventTimes((response.data as { event?: Record<string, unknown> } | undefined)?.event) });
          }

          const response = await client.invoke(
            "feishu_calendar_event.delete",
            (sdk, opts) =>
              sdk.calendar.calendarEvent.delete(
                {
                  path: { calendar_id: calendarId, event_id: payload.event_id! },
                  params: { need_notification: payload.need_notification ?? true },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ success: true, event_id: payload.event_id });
        } catch (error) {
          return handleInvokeError(error, api);
        }
      },
    },
    { name: "feishu_calendar_event" },
  );
}
