import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, registerTool, StringEnum } from "./user-tool-helpers.js";

const TasklistSchema = Type.Union([
  Type.Object({ action: Type.Literal("create"), name: Type.String(), members: Type.Optional(Type.Array(Type.Object({ id: Type.String(), role: Type.Optional(StringEnum(["editor", "viewer"])) }))) }),
  Type.Object({ action: Type.Literal("get"), tasklist_guid: Type.String() }),
  Type.Object({ action: Type.Literal("list"), page_size: Type.Optional(Type.Number()), page_token: Type.Optional(Type.String()) }),
  Type.Object({ action: Type.Literal("tasks"), tasklist_guid: Type.String(), page_size: Type.Optional(Type.Number()), page_token: Type.Optional(Type.String()), completed: Type.Optional(Type.Boolean()) }),
  Type.Object({ action: Type.Literal("patch"), tasklist_guid: Type.String(), name: Type.Optional(Type.String()) }),
  Type.Object({ action: Type.Literal("add_members"), tasklist_guid: Type.String(), members: Type.Array(Type.Object({ id: Type.String(), role: Type.Optional(StringEnum(["editor", "viewer"])) }))) }),
]);

export function registerFeishuTaskTasklistTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_task_tasklist");
  registerTool(api, {
    name: "feishu_task_tasklist",
    label: "Feishu Tasklist",
    description: "按本人身份创建、查询和管理飞书任务清单。",
    parameters: TasklistSchema,
    async execute(_toolCallId, params) {
      const payload = params as {
        action: "create" | "get" | "list" | "tasks" | "patch" | "add_members";
        tasklist_guid?: string;
        name?: string;
        members?: Array<{ id: string; role?: string }>;
        page_size?: number;
        page_token?: string;
        completed?: boolean;
      };
      try {
        const client = toolClient();
        if (payload.action === "create") {
          const response = await client.invoke(
            "feishu_task_tasklist.create",
            (sdk, opts) =>
              sdk.task.v2.tasklist.create(
                {
                  params: { user_id_type: "open_id" as never },
                  data: {
                    name: payload.name,
                    members: payload.members?.map((member) => ({
                      id: member.id,
                      type: "user",
                      role: member.role ?? "editor",
                    })),
                  },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ tasklist: (response.data as { tasklist?: unknown } | undefined)?.tasklist });
        }
        if (payload.action === "get") {
          const response = await client.invoke(
            "feishu_task_tasklist.get",
            (sdk, opts) =>
              sdk.task.v2.tasklist.get(
                { path: { tasklist_guid: payload.tasklist_guid! }, params: { user_id_type: "open_id" as never } },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ tasklist: (response.data as { tasklist?: unknown } | undefined)?.tasklist });
        }
        if (payload.action === "list") {
          const response = await client.invoke(
            "feishu_task_tasklist.list",
            (sdk, opts) =>
              sdk.task.v2.tasklist.list(
                { params: { page_size: payload.page_size, page_token: payload.page_token, user_id_type: "open_id" as never } },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({
            tasklists: (response.data as { items?: unknown[] } | undefined)?.items ?? [],
            has_more: (response.data as { has_more?: boolean } | undefined)?.has_more ?? false,
            page_token: (response.data as { page_token?: string } | undefined)?.page_token,
          });
        }
        if (payload.action === "tasks") {
          const response = await client.invoke(
            "feishu_task_tasklist.tasks",
            (sdk, opts) =>
              sdk.task.v2.tasklist.tasks(
                {
                  path: { tasklist_guid: payload.tasklist_guid! },
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
        if (payload.action === "patch") {
          const response = await client.invoke(
            "feishu_task_tasklist.patch",
            (sdk, opts) =>
              sdk.task.v2.tasklist.patch(
                {
                  path: { tasklist_guid: payload.tasklist_guid! },
                  params: { user_id_type: "open_id" as never },
                  data: { name: payload.name },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ tasklist: (response.data as { tasklist?: unknown } | undefined)?.tasklist });
        }
        const response = await client.invoke(
          "feishu_task_tasklist.add_members",
          (sdk, opts) =>
            sdk.task.v2.tasklist.addMembers(
              {
                path: { tasklist_guid: payload.tasklist_guid! },
                params: { user_id_type: "open_id" as never },
                data: {
                  members: (payload.members ?? []).map((member) => ({
                    id: member.id,
                    type: "user",
                    role: member.role ?? "editor",
                  })),
                },
              },
              opts,
            ),
          { as: "user" },
        );
        assertLarkOk(response);
        return json({ success: true, tasklist_guid: payload.tasklist_guid });
      } catch (error) {
        return handleInvokeError(error, api);
      }
    },
  }, { name: "feishu_task_tasklist" });
}
