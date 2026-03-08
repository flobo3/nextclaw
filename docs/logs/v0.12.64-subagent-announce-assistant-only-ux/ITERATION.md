# v0.12.64-subagent-announce-assistant-only-ux

## 迭代完成说明（改了什么）
- 子代理回传从“可见 user 消息注入”改为“内部系统事件 + assistant 最终回复”。
- `SubagentManager` 回传时增加结构化元数据：`system_event_kind=subagent_completion`、`subagent_label`、`subagent_status`。
- `AgentLoop.processSystemMessage` 不再写入 `role=user` 的会话消息；改为写入 `system.*` 事件，不投射为聊天消息。
- 系统回传给模型的当前输入统一为 `[System Message from <sender>]` 前缀格式，减少提示歧义。
- 新增回归测试，确保系统回传不会污染用户消息轨道。

## 测试/验证/验收方式
- 定向测试：
  - `pnpm -C packages/nextclaw-core test -- --run src/agent/subagent.test.ts src/agent/loop.system-message.test.ts`
- 全量验证：
  - `pnpm build`
  - `pnpm lint`
  - `pnpm tsc`
- 冒烟（隔离目录，不写仓库）：
  - 在 `/tmp` 下设置 `NEXTCLAW_HOME` 与临时工作目录，执行最小链路脚本。
  - 观察点：`SMOKE_OK roles=assistant internal=true`（无 `user`，有 `system.subagent_completion` 事件）。

## 发布/部署方式
- 本次为核心会话行为改动，按常规发布链路：
  - 合并后执行版本流程（changeset/version/publish）
  - 发布后在目标环境做一次会话回归验证（spawn 子代理并观察消息轨道）
- 若仅内部验证，不涉及部署动作，本节标记为“待发布”。

## 用户/产品视角的验收步骤
1. 在任意会话里触发 `spawn` 子代理任务。
2. 等待子代理完成回传。
3. 检查会话时间线：
   - 不应新增“伪用户消息”。
   - 只应看到 assistant 的自然语言结果回复。
4. 连续触发 2 次子代理回传，确认仍不出现 user 角色污染。
