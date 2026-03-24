import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { normalizeTaskTime } from "./task-shared.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, registerTool, StringEnum } from "./user-tool-helpers.js";

const SubtaskSchema = Type.Union([
  Type.Object({
    action: Type.Literal("create"),
    task_guid: Type.String(),
    summary: Type.String(),
    description: Type.Optional(Type.String()),
    due: Type.Optional(Type.Object({ timestamp: Type.String(), is_all_day: Type.Optional(Type.Boolean()) })),
    start: Type.Optional(Type.Object({ timestamp: Type.String(), is_all_day: Type.Optional(Type.Boolean()) })),
    members: Type.Optional(Type.Array(Type.Object({ id: Type.String(), role: Type.Optional(StringEnum(["assignee", "follower"])) }))),
  }),
  Type.Object({ action: Type.Literal("list"), task_guid: Type.String(), page_size: Type.Optional(Type.Number()), page_token: Type.Optional(Type.String()) }),
]);

export function registerFeishuTaskSubtaskTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_task_subtask");
  registerTool(api, {
    name: "feishu_task_subtask",
    label: "Feishu Task Subtask",
    description: "按本人身份创建、列出任务的子任务。",
    parameters: SubtaskSchema,
    async execute(_toolCallId, params) {
      const payload = params as {
        action: "create" | "list";
        task_guid: string;
        summary?: string;
        description?: string;
        due?: { timestamp?: string; is_all_day?: boolean };
        start?: { timestamp?: string; is_all_day?: boolean };
        members?: Array<{ id: string; role?: string }>;
        page_size?: number;
        page_token?: string;
      };
      try {
        const client = toolClient();
        if (payload.action === "create") {
          const response = await client.invoke(
            "feishu_task_subtask.create",
            (sdk, opts) =>
              sdk.task.v2.taskSubtask.create(
                {
                  path: { task_guid: payload.task_guid },
                  params: { user_id_type: "open_id" as never },
                  data: {
                    summary: payload.summary,
                    description: payload.description,
                    due: normalizeTaskTime(payload.due),
                    start: normalizeTaskTime(payload.start),
                    members: payload.members?.map((member) => ({
                      id: member.id,
                      type: "user",
                      role: member.role ?? "assignee",
                    })),
                  },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ subtask: (response.data as { subtask?: unknown } | undefined)?.subtask });
        }
        const response = await client.invoke(
          "feishu_task_subtask.list",
          (sdk, opts) =>
            sdk.task.v2.taskSubtask.list(
              {
                path: { task_guid: payload.task_guid },
                params: {
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
        return json({
          subtasks: (response.data as { items?: unknown[] } | undefined)?.items ?? [],
          has_more: (response.data as { has_more?: boolean } | undefined)?.has_more ?? false,
          page_token: (response.data as { page_token?: string } | undefined)?.page_token,
        });
      } catch (error) {
        return handleInvokeError(error, api);
      }
    },
  }, { name: "feishu_task_subtask" });
}
