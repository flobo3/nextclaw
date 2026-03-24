import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, registerTool } from "./user-tool-helpers.js";

const CalendarCalendarSchema = Type.Union([
  Type.Object({ action: Type.Literal("list"), page_size: Type.Optional(Type.Number()), page_token: Type.Optional(Type.String()) }),
  Type.Object({ action: Type.Literal("get"), calendar_id: Type.String() }),
  Type.Object({ action: Type.Literal("primary") }),
]);

export function registerFeishuCalendarCalendarTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_calendar_calendar");
  registerTool(
    api,
    {
      name: "feishu_calendar_calendar",
      label: "Feishu Calendar",
      description: "按本人身份查询飞书日历列表、主日历和指定日历详情。",
      parameters: CalendarCalendarSchema,
      async execute(_toolCallId, params) {
        const payload = params as {
          action: "list" | "get" | "primary";
          page_size?: number;
          page_token?: string;
          calendar_id?: string;
        };
        try {
          const client = toolClient();
          if (payload.action === "list") {
            const response = await client.invoke(
              "feishu_calendar_calendar.list",
              (sdk, opts) =>
                sdk.calendar.calendar.list(
                  { params: { page_size: payload.page_size, page_token: payload.page_token } },
                  opts,
                ),
              { as: "user" },
            );
            assertLarkOk(response);
            return json({
              calendars: (response.data as { calendar_list?: unknown[] } | undefined)?.calendar_list ?? [],
              has_more: (response.data as { has_more?: boolean } | undefined)?.has_more ?? false,
              page_token: (response.data as { page_token?: string } | undefined)?.page_token,
            });
          }
          if (payload.action === "primary") {
            const response = await client.invoke(
              "feishu_calendar_calendar.primary",
              (sdk, opts) => sdk.calendar.calendar.primary({}, opts),
              { as: "user" },
            );
            assertLarkOk(response);
            return json({
              calendars: (response.data as { calendars?: unknown[] } | undefined)?.calendars ?? [],
            });
          }
          const response = await client.invoke(
            "feishu_calendar_calendar.get",
            (sdk, opts) =>
              sdk.calendar.calendar.get({ path: { calendar_id: payload.calendar_id! } }, opts),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ calendar: (response.data as { calendar?: unknown } | undefined)?.calendar ?? response.data });
        } catch (error) {
          return handleInvokeError(error, api);
        }
      },
    },
    { name: "feishu_calendar_calendar" },
  );
}
