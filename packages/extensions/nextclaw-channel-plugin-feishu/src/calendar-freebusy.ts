import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, parseTimeToRFC3339, registerTool } from "./user-tool-helpers.js";

const CalendarFreebusySchema = Type.Object({
  action: Type.Literal("list"),
  user_ids: Type.Array(Type.String()),
  time_min: Type.String(),
  time_max: Type.String(),
});

export function registerFeishuCalendarFreebusyTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_calendar_freebusy");
  registerTool(api, {
    name: "feishu_calendar_freebusy",
    label: "Feishu Calendar Freebusy",
    description: "按本人身份查询 1-10 位用户在一段时间内的忙闲状态。",
    parameters: CalendarFreebusySchema,
    async execute(_toolCallId, params) {
      const payload = params as { action: "list"; user_ids: string[]; time_min: string; time_max: string };
      try {
        if (!payload.user_ids?.length || payload.user_ids.length > 10) {
          return json({ error: "user_ids 必须是 1-10 个用户 open_id。" });
        }
        const timeMin = parseTimeToRFC3339(payload.time_min);
        const timeMax = parseTimeToRFC3339(payload.time_max);
        if (!timeMin || !timeMax) {
          return json({ error: "time_min 和 time_max 必须是带时区的 RFC 3339 时间。" });
        }
        const client = toolClient();
        const response = await client.invoke(
          "feishu_calendar_freebusy.list",
          (sdk, opts) =>
            sdk.calendar.freebusy.batch(
              {
                data: {
                  time_min: timeMin,
                  time_max: timeMax,
                  user_ids: payload.user_ids,
                  include_external_calendar: true,
                  only_busy: true,
                } as never,
              },
              opts,
            ),
          { as: "user" },
        );
        assertLarkOk(response);
        return json({
          freebusy_lists:
            (response.data as { freebusy_lists?: unknown[] } | undefined)?.freebusy_lists ?? [],
        });
      } catch (error) {
        return handleInvokeError(error, api);
      }
    },
  }, { name: "feishu_calendar_freebusy" });
}
