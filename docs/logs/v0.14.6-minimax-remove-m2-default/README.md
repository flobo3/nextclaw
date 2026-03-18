# v0.14.6-minimax-remove-m2-default

## 迭代完成说明

- 从 MiniMax 内置 provider 的默认模型列表中移除：
  - `minimax/MiniMax-M2`
- MiniMax 默认模型列表现在收敛为：
  - `minimax/MiniMax-M2.7`
  - `minimax/MiniMax-M2.7-highspeed`
  - `minimax/MiniMax-M2.5`
  - `minimax/MiniMax-M2.5-highspeed`
- 同步更新 provider meta 测试断言，确保 UI 读到的默认模型列表不再包含 `MiniMax-M2`。

## 测试/验证/验收方式

- 类型检查：
  - `pnpm -C packages/nextclaw-runtime tsc`
- 定向测试：
  - `pnpm -C packages/nextclaw-server test -- --run src/ui/router.provider-test.test.ts`
- API 冒烟：
  - `pnpm -C packages/nextclaw-server exec tsx --eval '...createUiRouter(...)/api/config/meta...'`
  - 观察点：`minimax.defaultModels` 只包含 `M2.7 / M2.7-highspeed / M2.5 / M2.5-highspeed`
- 可维护性自检：
  - `python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/nextclaw-runtime/src/providers/plugins/builtin.ts packages/nextclaw-server/src/ui/router.provider-test.test.ts`
- 结果：
  - `tsc` 通过
  - `router.provider-test.test.ts` 15/15 通过
  - API 冒烟返回 `status=200`，且默认模型列表不再包含 `MiniMax-M2`
  - 可维护性检查无阻塞项；`builtin.ts` 与 `router.provider-test.test.ts` 仍接近预算线

## 发布/部署方式

- 本次仅涉及内置 provider 默认模型元数据与测试，无独立部署步骤。
- 随后续常规版本发布进入产物即可，不涉及 migration。

## 用户/产品视角的验收步骤

1. 打开 NextClaw UI 的 Provider 配置页，选择 `MiniMax`。
2. 确认默认模型列表中不再出现 `MiniMax-M2`。
3. 确认仍可见：
   - `MiniMax-M2.7`
   - `MiniMax-M2.7-highspeed`
   - `MiniMax-M2.5`
   - `MiniMax-M2.5-highspeed`
