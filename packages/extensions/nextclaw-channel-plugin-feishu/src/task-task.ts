import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { normalizeTaskTime } from "./task-shared.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, parseTimeToTimestampMs, registerTool, StringEnum } from "./user-tool-helpers.js";

const TaskSchema = Type.Union([
  Type.Object({
    action: Type.Literal("create"),
    summary: Type.String(),
    current_user_id: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    due: Type.Optional(Type.Object({ timestamp: Type.String(), is_all_day: Type.Optional(Type.Boolean()) })),
    start: Type.Optional(Type.Object({ timestamp: Type.String(), is_all_day: Type.Optional(Type.Boolean()) })),
    members: Type.Optional(Type.Array(Type.Object({ id: Type.String(), role: Type.Optional(StringEnum(["assignee", "follower"])) }))),
    tasklists: Type.Optional(Type.Array(Type.Object({ tasklist_guid: Type.String(), section_guid: Type.Optional(Type.String()) }))),
    repeat_rule: Type.Optional(Type.String()),
  }),
  Type.Object({ action: Type.Literal("get"), task_guid: Type.String() }),
  Type.Object({ action: Type.Literal("list"), page_size: Type.Optional(Type.Number()), page_token: Type.Optional(Type.String()), completed: Type.Optional(Type.Boolean()) }),
  Type.Object({
    action: Type.Literal("patch"),
    task_guid: Type.String(),
    summary: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    due: Type.Optional(Type.Object({ timestamp: Type.String(), is_all_day: Type.Optional(Type.Boolean()) })),
    start: Type.Optional(Type.Object({ timestamp: Type.String(), is_all_day: Type.Optional(Type.Boolean()) })),
    completed_at: Type.Optional(Type.String()),
    members: Type.Optional(Type.Array(Type.Object({ id: Type.String(), role: Type.Optional(StringEnum(["assignee", "follower"])) }))),
    repeat_rule: Type.Optional(Type.String()),
  }),
]);

export function registerFeishuTaskTaskTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_task_task");
  registerTool(api, {
    name: "feishu_task_task",
    label: "Feishu Task",
    description: "按本人身份创建、查询、列出、更新飞书任务。",
    parameters: TaskSchema,
    async execute(_toolCallId, params) {
      const payload = params as {
        action: "create" | "get" | "list" | "patch";
        task_guid?: string;
        summary?: string;
        current_user_id?: string;
        description?: string;
        due?: { timestamp?: string; is_all_day?: boolean };
        start?: { timestamp?: string; is_all_day?: boolean };
        members?: Array<{ id: string; role?: string }>;
        tasklists?: Array<{ tasklist_guid: string; section_guid?: string }>;
        repeat_rule?: string;
        page_size?: number;
        page_token?: string;
        completed?: boolean;
        completed_at?: string;
      };
      try {
        const client = toolClient();
        if (payload.action === "create") {
          const members = [...(payload.members ?? [])];
          if (payload.current_user_id && !members.some((member) => member.id === payload.current_user_id)) {
            members.push({ id: payload.current_user_id, role: "follower" });
          }
          const response = await client.invoke(
            "feishu_task_task.create",
            (sdk, opts) =>
              sdk.task.v2.task.create(
                {
                  params: { user_id_type: "open_id" as never },
                  data: {
                    summary: payload.summary,
                    description: payload.description,
                    due: normalizeTaskTime(payload.due),
                    start: normalizeTaskTime(payload.start),
                    repeat_rule: payload.repeat_rule,
                    members: members.length
                      ? members.map((member) => ({
                          id: member.id,
                          type: "user",
                          role: member.role ?? "assignee",
                        }))
                      : undefined,
                    tasklists: payload.tasklists,
                  },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ task: (response.data as { task?: unknown } | undefined)?.task });
        }
        if (payload.action === "get") {
          const response = await client.invoke(
            "feishu_task_task.get",
            (sdk, opts) =>
              sdk.task.v2.task.get(
                { path: { task_guid: payload.task_guid! }, params: { user_id_type: "open_id" as never } },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ task: (response.data as { task?: unknown } | undefined)?.task });
        }
        if (payload.action === "list") {
          const response = await client.invoke(
            "feishu_task_task.list",
            (sdk, opts) =>
              sdk.task.v2.task.list(
                {
                  params: {
                    page_size: payload.page_size,
                    page_token: payload.page_token,
                    completed: payload.completed,
                    user_id_type: "open_id" as never,
                  },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({
            tasks: (response.data as { items?: unknown[] } | undefined)?.items ?? [],
            has_more: (response.data as { has_more?: boolean } | undefined)?.has_more ?? false,
            page_token: (response.data as { page_token?: string } | undefined)?.page_token,
          });
        }

        const patchData: Record<string, unknown> = {};
        if (payload.summary) patchData.summary = payload.summary;
        if (payload.description) patchData.description = payload.description;
        if (payload.due) patchData.due = normalizeTaskTime(payload.due);
        if (payload.start) patchData.start = normalizeTaskTime(payload.start);
        if (payload.repeat_rule) patchData.repeat_rule = payload.repeat_rule;
        if (payload.completed_at !== undefined) {
          patchData.completed_at =
            payload.completed_at === "0"
              ? "0"
              : /^\d+$/.test(payload.completed_at)
                ? payload.completed_at
                : parseTimeToTimestampMs(payload.completed_at);
        }
        if (payload.members) {
          patchData.members = payload.members.map((member) => ({
            id: member.id,
            type: "user",
            role: member.role ?? "assignee",
          }));
        }
        const response = await client.invoke(
          "feishu_task_task.patch",
          (sdk, opts) =>
            sdk.task.v2.task.patch(
              {
                path: { task_guid: payload.task_guid! },
                params: { user_id_type: "open_id" as never },
                data: patchData,
              },
              opts,
            ),
          { as: "user" },
        );
        assertLarkOk(response);
        return json({ task: (response.data as { task?: unknown } | undefined)?.task });
      } catch (error) {
        return handleInvokeError(error, api);
      }
    },
  }, { name: "feishu_task_task" });
}
