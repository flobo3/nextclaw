import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, registerTool, StringEnum } from "./user-tool-helpers.js";

const CalendarAttendeeSchema = Type.Union([
  Type.Object({
    action: Type.Literal("create"),
    calendar_id: Type.String(),
    event_id: Type.String(),
    attendees: Type.Array(Type.Object({ type: StringEnum(["user", "chat", "resource", "third_party"]), attendee_id: Type.String() })),
    need_notification: Type.Optional(Type.Boolean()),
  }),
  Type.Object({
    action: Type.Literal("list"),
    calendar_id: Type.String(),
    event_id: Type.String(),
    page_size: Type.Optional(Type.Number()),
    page_token: Type.Optional(Type.String()),
    user_id_type: Type.Optional(StringEnum(["open_id", "union_id", "user_id"])),
  }),
]);

export function registerFeishuCalendarEventAttendeeTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_calendar_event_attendee");
  registerTool(api, {
    name: "feishu_calendar_event_attendee",
    label: "Feishu Calendar Event Attendee",
    description: "按本人身份添加日程参会人或查看参会人列表。",
    parameters: CalendarAttendeeSchema,
    async execute(_toolCallId, params) {
      const payload = params as {
        action: "create" | "list";
        calendar_id: string;
        event_id: string;
        attendees?: Array<{ type: "user" | "chat" | "resource" | "third_party"; attendee_id: string }>;
        need_notification?: boolean;
        page_size?: number;
        page_token?: string;
        user_id_type?: "open_id" | "union_id" | "user_id";
      };
      try {
        const client = toolClient();
        if (payload.action === "create") {
          const attendeePayload = (payload.attendees ?? []).map((attendee) => {
            if (attendee.type === "user") return { type: attendee.type, user_id: attendee.attendee_id };
            if (attendee.type === "chat") return { type: attendee.type, chat_id: attendee.attendee_id };
            if (attendee.type === "resource") return { type: attendee.type, room_id: attendee.attendee_id };
            return { type: attendee.type, third_party_email: attendee.attendee_id };
          });
          const response = await client.invoke(
            "feishu_calendar_event_attendee.create",
            (sdk, opts) =>
              sdk.calendar.calendarEventAttendee.create(
                {
                  path: { calendar_id: payload.calendar_id, event_id: payload.event_id },
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
          assertLarkOk(response);
          return json({ attendees: (response.data as { attendees?: unknown[] } | undefined)?.attendees ?? [] });
        }
        const response = await client.invoke(
          "feishu_calendar_event_attendee.list",
          (sdk, opts) =>
            sdk.calendar.calendarEventAttendee.list(
              {
                path: { calendar_id: payload.calendar_id, event_id: payload.event_id },
                params: {
                  page_size: payload.page_size,
                  page_token: payload.page_token,
                  user_id_type: payload.user_id_type ?? "open_id",
                },
              },
              opts,
            ),
          { as: "user" },
        );
        assertLarkOk(response);
        return json({
          attendees: (response.data as { items?: unknown[] } | undefined)?.items ?? [],
          has_more: (response.data as { has_more?: boolean } | undefined)?.has_more ?? false,
          page_token: (response.data as { page_token?: string } | undefined)?.page_token,
        });
      } catch (error) {
        return handleInvokeError(error, api);
      }
    },
  }, { name: "feishu_calendar_event_attendee" });
}
