# v0.14.13-nextclaw-native-think-normalization-default-on

## 迭代完成说明

- 将 `nextclaw` 产品层的 native NCP runtime 默认推理标记规范化模式从“默认关闭”调整为“默认开启”。
- 当前行为变为：
  - `@nextclaw/ncp` / `@nextclaw/ncp-agent-runtime` 作为通用积木仍保持默认关闭。
  - `nextclaw` 在创建 native NCP runtime 时，若用户未显式配置，则默认使用 `think-tags`。
- 同时保留显式关闭能力：
  - `ui.ncp.runtimes.native.reasoningNormalization.mode: off`

## 测试 / 验证 / 验收方式

- `pnpm -C packages/nextclaw test -- run src/cli/commands/ncp/create-ui-ncp-agent.reasoning-normalization.test.ts`
- `pnpm -C packages/nextclaw tsc`
- `python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.reasoning-normalization.test.ts`

## 发布 / 部署方式

- 合入后按现有 `nextclaw` 发布流程发布。
- 默认无需额外配置即可在 native NCP runtime 中启用 `<think>` -> `reasoning part` 规范化。
- 若需要关闭，可设置：

```yaml
ui:
  ncp:
    runtimes:
      native:
        reasoningNormalization:
          mode: off
```

## 用户 / 产品视角的验收步骤

1. 不做任何额外配置，直接启动 `nextclaw` 的 native NCP chat。
2. 使用会输出 `<think>...</think><final>...` 的模型发起一轮实时对话。
3. 确认推理内容显示为 reasoning block，正文显示为普通回复，不再残留 `<think>` 标签。
4. 如需回退，显式配置 `mode: off` 后重启服务，再次发送消息确认 `<think>` 不再被结构化。
