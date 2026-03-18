# v0.14.10-ncp-think-tag-reasoning-normalization

## 迭代完成说明

- 在 `@nextclaw/ncp` 新增共享 assistant 推理标记规范化能力：
  - 支持把以 `<think>` 开头、并通过 `</think>` 或 `<final>` 收束的内容拆成结构化 `reasoning` / `text`
  - 只在显式开启 `think-tags` 模式时生效，默认关闭
- 在 `@nextclaw/ncp-agent-runtime` 的实时 stream 编码链路接入该能力：
  - native NCP runtime 在实时输出阶段直接发出 `message.reasoning-delta`
  - UI 不再需要把 `<think>` 当普通文本渲染，也不会再因为 `skipHtml` 吞掉标签而出现空气泡
- 在 native runtime 配置入口接入开关：
  - 读取 `ui.ncp.runtimes.native.reasoningNormalization.mode`
  - 支持 `think-tags`
  - 启用后会把规范化配置写入当前 session metadata，保持该 session 的 runtime 行为一致
- 本次实现严格收敛到实时 stream 主链路，不处理历史回放链路。

## 测试 / 验证 / 验收方式

- 类型检查：
  - `pnpm -C packages/ncp-packages/nextclaw-ncp tsc`
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime tsc`
  - `pnpm -C packages/nextclaw tsc`
- 定向测试：
  - `pnpm -C packages/nextclaw test -- run src/cli/commands/ncp/stream-encoder-reasoning-normalization.test.ts src/cli/commands/ncp/create-ui-ncp-agent.reasoning-normalization.test.ts`
- 可维护性自检：
  - `python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/ncp-packages/nextclaw-ncp/src/toolkit/reasoning-normalization.ts packages/ncp-packages/nextclaw-ncp/src/toolkit/index.ts packages/ncp-packages/nextclaw-ncp-agent-runtime/src/stream-encoder.utils.ts packages/ncp-packages/nextclaw-ncp-agent-runtime/src/stream-encoder.ts packages/ncp-packages/nextclaw-ncp-agent-runtime/src/round-collector.ts packages/ncp-packages/nextclaw-ncp-agent-runtime/src/runtime.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts packages/nextclaw/src/cli/commands/ncp/stream-encoder-reasoning-normalization.test.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.reasoning-normalization.test.ts`

## 发布 / 部署方式

- 合入后按现有 `nextclaw` 发布流程发布受影响包。
- 若需要开启该能力，在配置中加入：

```yaml
ui:
  ncp:
    runtimes:
      native:
        reasoningNormalization:
          mode: think-tags
```

- 默认不配置即为关闭，不影响其它 provider / runtime 的既有行为。

## 用户 / 产品视角的验收步骤

1. 在配置中开启 `ui.ncp.runtimes.native.reasoningNormalization.mode: think-tags`。
2. 使用会输出 `<think>...</think><final>...` 或 `<think>...<final>...` 的模型发起一轮实时对话。
3. 观察前端：
   - 推理内容显示为 reasoning block
   - 最终回答显示为普通正文
   - 不再先出现一个没有可见内容的 assistant 空气泡
4. 观察实时事件或最终会话记录：
   - assistant 最终输出被拆成结构化 `reasoning` 与 `text`
   - 最终正文中不再残留 `<think>` / `<final>` 标签
