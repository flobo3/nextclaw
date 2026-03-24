import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { assertLarkOk, createToolContext, handleInvokeError, json, registerTool, StringEnum } from "./user-tool-helpers.js";

const CommentSchema = Type.Union([
  Type.Object({ action: Type.Literal("create"), task_guid: Type.String(), content: Type.String(), reply_to_comment_id: Type.Optional(Type.String()) }),
  Type.Object({ action: Type.Literal("list"), resource_id: Type.String(), direction: Type.Optional(StringEnum(["asc", "desc"])), page_size: Type.Optional(Type.Number()), page_token: Type.Optional(Type.String()) }),
  Type.Object({ action: Type.Literal("get"), comment_id: Type.String() }),
]);

export function registerFeishuTaskCommentTool(api: OpenClawPluginApi) {
  const { toolClient } = createToolContext(api, "feishu_task_comment");
  registerTool(api, {
    name: "feishu_task_comment",
    label: "Feishu Task Comment",
    description: "按本人身份创建、获取、列出任务评论。",
    parameters: CommentSchema,
    async execute(_toolCallId, params) {
      const payload = params as {
        action: "create" | "get" | "list";
        task_guid?: string;
        content?: string;
        reply_to_comment_id?: string;
        resource_id?: string;
        direction?: "asc" | "desc";
        page_size?: number;
        page_token?: string;
        comment_id?: string;
      };
      try {
        const client = toolClient();
        if (payload.action === "create") {
          const response = await client.invoke(
            "feishu_task_comment.create",
            (sdk, opts) =>
              sdk.task.v2.comment.create(
                {
                  params: { user_id_type: "open_id" as never },
                  data: {
                    content: payload.content,
                    resource_type: "task",
                    resource_id: payload.task_guid,
                    reply_to_comment_id: payload.reply_to_comment_id,
                  },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ comment: (response.data as { comment?: unknown } | undefined)?.comment });
        }
        if (payload.action === "get") {
          const response = await client.invoke(
            "feishu_task_comment.get",
            (sdk, opts) =>
              sdk.task.v2.comment.get(
                { path: { comment_id: payload.comment_id! }, params: { user_id_type: "open_id" as never } },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({ comment: (response.data as { comment?: unknown } | undefined)?.comment });
        }
        const response = await client.invoke(
          "feishu_task_comment.list",
          (sdk, opts) =>
            sdk.task.v2.comment.list(
              {
                params: {
                  resource_type: "task",
                  resource_id: payload.resource_id,
                  direction: payload.direction,
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
          comments: (response.data as { items?: unknown[] } | undefined)?.items ?? [],
          has_more: (response.data as { has_more?: boolean } | undefined)?.has_more ?? false,
          page_token: (response.data as { page_token?: string } | undefined)?.page_token,
        });
      } catch (error) {
        return handleInvokeError(error, api);
      }
    },
  }, { name: "feishu_task_comment" });
}
