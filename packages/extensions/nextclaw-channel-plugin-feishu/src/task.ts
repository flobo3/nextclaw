import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { listEnabledFeishuAccounts } from "./accounts.js";
import { resolveAnyEnabledFeishuToolsConfig } from "./tool-account.js";
import { registerFeishuTaskCommentTool } from "./task-comment.js";
import { registerFeishuTaskSubtaskTool } from "./task-subtask.js";
import { registerFeishuTaskTaskTool } from "./task-task.js";
import { registerFeishuTaskTasklistTool } from "./task-tasklist.js";

export function registerFeishuTaskTools(api: OpenClawPluginApi) {
  if (!api.config) return;
  const accounts = listEnabledFeishuAccounts(api.config);
  if (accounts.length === 0) return;
  if (!resolveAnyEnabledFeishuToolsConfig(accounts).task) return;
  registerFeishuTaskTaskTool(api);
  registerFeishuTaskTasklistTool(api);
  registerFeishuTaskCommentTool(api);
  registerFeishuTaskSubtaskTool(api);
}
