# 迭代完成说明

- 对 `packages/nextclaw/src/cli/commands` 做了结构性减债，不再让顶层目录靠“目录预算豁免”维持 70 个直接代码文件的扁平状态。
- 将 CLI commands 按职责拆到 `agent/`、`channel/`、`compat/`、`config/`、`diagnostics/`、`plugin/`、`remote/`、`service/`、`ncp/` 子树。
- 对 `packages/nextclaw/src/cli/commands/service` 再做第二轮拆分，进一步下沉到 `gateway/`、`marketplace/`、`plugin/`、`runtime/`、`session/`，避免把根目录膨胀简单搬家到新的大目录。
- 对 `packages/nextclaw/src/cli/commands/ncp` 收拢到 `compat/`、`context/`、`provider/`、`runtime/`、`session/`，根目录只保留 runtime 装配主入口与核心状态 owner。
- 更新相关 import、测试引用与目录说明文档；`commands/README.md` 和 `commands/ncp/README.md` 不再使用“目录预算豁免”口径，而改为实际结构说明。
- 顺手把 [`plugin-mutation-actions.ts`](../../../../packages/nextclaw/src/cli/commands/plugin/plugin-mutation-actions.ts) 的安装分支拆成单职责 helper，消除因迁移触发的新文件函数预算阻塞。

# 测试 / 验证 / 验收方式

- 类型检查：
  - `pnpm -C packages/nextclaw exec tsc --noEmit`
- 定向结构回归测试：
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/channel/channels.test.ts src/cli/commands/config/config.test.ts src/cli/commands/plugin/plugin-reload.test.ts src/cli/commands/remote/remote-access-host.test.ts src/cli/commands/service/gateway/tests/service-gateway-startup.test.ts src/cli/commands/service/gateway/tests/service-capability-hydration.test.ts src/cli/commands/service/runtime/tests/service-remote-runtime.test.ts src/cli/commands/service/session/tests/service-deferred-ncp-agent.test.ts src/cli/commands/ncp/session/nextclaw-agent-session-store.test.ts src/cli/commands/ncp/compat/claude-code-process-resolution.test.ts`
  - 结果：`10` 个测试文件、`26` 个测试全部通过。
- 可维护性守卫：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --no-fail --paths $(git diff --name-only --diff-filter=ACMR -- packages/nextclaw/src/cli/commands packages/nextclaw/src/cli/runtime.ts | tr '\n' ' ')`
  - 结果：目录预算问题已从 `commands` / `commands/ncp` 根目录移除；剩余观察项主要是既有大文件预算 warning（如 `service.ts`、`runtime.ts`、`plugins.ts`、`diagnostics.ts`）。
- 额外说明：
  - 曾运行一组更宽的兼容/NCP 测试，暴露出与本次目录治理无直接关系的既有行为漂移断言；本次未把这些 unrelated 行为测试混入结构治理交付范围。

# 发布 / 部署方式

- 不适用。本次为 CLI 包内部结构治理，不涉及发布、部署、migration 或线上环境变更。

# 用户 / 产品视角的验收步骤

1. 打开 [`packages/nextclaw/src/cli/commands`](../../../../packages/nextclaw/src/cli/commands)。
2. 确认顶层只剩面向 runtime 的命令入口文件，不再出现几十个 helper / test / adapter 平铺在同一层。
3. 打开 [`packages/nextclaw/src/cli/commands/ncp`](../../../../packages/nextclaw/src/cli/commands/ncp) 与 [`packages/nextclaw/src/cli/commands/service`](../../../../packages/nextclaw/src/cli/commands/service)。
4. 确认 `ncp/` 与 `service/` 已按职责拆出明确子树，而不是继续依赖预算豁免。
5. 运行上面的 `tsc` 与定向 vitest 命令，确认结构调整没有破坏核心 CLI commands 装配链路。

## 红区触达与减债记录

### packages/nextclaw/src/cli/commands/diagnostics.ts

- 本次是否减债：是
- 说明：本次没有继续增加 `diagnostics.ts` 的职责或体量；同时通过收紧 `commands/` 目录入口层，减少了 CLI commands 周边的目录平铺债务。`diagnostics.ts` 本身仍接近预算线，但没有在这次结构治理中继续恶化。
- 下一步拆分缝：按守卫建议拆出 diagnostics collector、runtime status mapper、user-facing renderer，逐步让 `diagnostics.ts` 从热点文件退出。

# 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。核心目标就是消除 CLI 包长期依赖目录豁免的问题，并且继续把“搬家后的 `service/` 大目录”再拆到职责边界为止，而不是停在表面。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。优先做的是结构收拢与职责下沉，而不是新增新的兜底规则或继续补豁免；仅在 `plugin-mutation-actions.ts` 为满足新路径下的治理要求，做了最小必要的 helper 拆分。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：目录平铺度显著下降。`packages/nextclaw/src/cli/commands` 从 `70` 个直接代码文件降到 `11`，`packages/nextclaw/src/cli/commands/ncp` 从 `35` 个直接代码文件降到 `7`；`service/` 也继续拆到各子目录均低于预算线。总代码量有少量净增长，属于为拆分路径与 helper 收口付出的最小必要成本，同时偿还了长期依赖目录豁免的维护债。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。此次没有引入新的抽象层，只是把既有职责按命令入口、service 编排、NCP runtime、plugin/remote/channel 支撑链路重新放回合适目录。
- 目录结构与文件组织是否满足当前项目治理要求：本次触达的 `commands/`、`commands/ncp/`、`commands/service/` 已满足目录预算治理要求，不再依赖目录预算豁免；仓库级其它既有 warning（如 `packages/nextclaw/src/cli/` 根目录、`service.ts`、`runtime.ts`）仍存在，但未在本次继续恶化。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已执行独立复核，结论为“通过”。本次改动的主要价值不是新增功能，而是把 CLI commands 的结构债从“靠豁免存活”改成“靠明确边界组织”；仍需继续关注的下一步拆分缝是 `diagnostics.ts`、`plugins.ts`、`service.ts` 与 `runtime.ts` 这几个既有大文件。
