# v0.14.2-minimax-model-catalog-refresh

## 迭代完成说明

- 更新 MiniMax 内置 provider 的默认模型列表，统一收敛为当前官方文本模型序列：
  - `minimax/MiniMax-M2.7`
  - `minimax/MiniMax-M2.7-highspeed`
  - `minimax/MiniMax-M2.5`
  - `minimax/MiniMax-M2.5-highspeed`
  - `minimax/MiniMax-M2.1`
  - `minimax/MiniMax-M2.1-highspeed`
  - `minimax/MiniMax-M2`
- 保留 MiniMax 的 `Wire API` 可配置能力，并维持默认值为 `chat`。
- 调整 MiniMax provider 提示文案，将 AI Coding Tools 推荐模型更新为 `MiniMax-M2.7`。
- 新增/更新 provider meta 测试，确保 UI 读取到的 MiniMax 默认模型列表与默认 `Wire API` 不回退。

## 测试/验证/验收方式

- 类型检查：
  - `pnpm -C packages/nextclaw-runtime tsc`
- 定向测试：
  - `pnpm -C packages/nextclaw-server test -- --run src/ui/router.provider-test.test.ts`
- 可维护性自检：
  - `python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/nextclaw-runtime/src/providers/plugins/builtin.ts packages/nextclaw-server/src/ui/router.provider-test.test.ts`
- 结果：
  - `tsc` 通过
  - `router.provider-test.test.ts` 15/15 通过
  - 可维护性检查无阻塞项；`builtin.ts` 与 `router.provider-test.test.ts` 仍接近预算线，后续可按 provider 分模块、按场景拆测试

## 发布/部署方式

- 本次改动仅涉及内置 provider 元数据与测试，无独立部署步骤。
- 随常规 `nextclaw` / UI 服务发布流程进入下一次版本发布即可。
- 若需要对外发布，按项目既有 release 流程执行，不涉及 migration。

## 用户/产品视角的验收步骤

1. 打开 NextClaw UI 的 Provider 配置页，选择 `MiniMax`。
2. 确认默认模型列表中能看到 `MiniMax-M2.7`、`MiniMax-M2.7-highspeed`、`MiniMax-M2.5`、`MiniMax-M2.5-highspeed`、`MiniMax-M2.1`、`MiniMax-M2.1-highspeed`、`MiniMax-M2`。
3. 确认 MiniMax 的 `Wire API` 配置项可见，默认值为 `Chat`。
4. 确认 MiniMax 提示文案中说明 AI Coding Tools 推荐使用 `MiniMax-M2.7`。
