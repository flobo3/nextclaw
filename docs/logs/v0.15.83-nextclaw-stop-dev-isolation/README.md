# v0.15.83-nextclaw-stop-dev-isolation

## 迭代完成说明

- 排查并确认根因：`nextclaw stop` 只认 `NEXTCLAW_HOME/run/service.json`，但前台 `nextclaw serve` / `pnpm dev start` 的本地 UI 运行时也会把自己写进同一份状态，导致开发态实例被误当成后台托管服务停止。
- 这次把修复继续收敛成长期模型，而不是保留补丁式双轨 helper：
  - 新增 [`ManagedServiceStateStore`](../../../packages/nextclaw/src/cli/runtime-state/managed-service-state.store.ts)，只负责 `service.json`，只表示“可被 start/stop/restart 管理的后台托管服务”。
  - 新增 [`LocalUiRuntimeStore`](../../../packages/nextclaw/src/cli/runtime-state/local-ui-runtime.store.ts)，只负责 `ui-runtime.json`，只表示“本地 UI 发现状态”。
  - 新增 [`LocalUiDiscoveryService`](../../../packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts)，统一本地 UI 发现顺序：优先活着的前台 UI，再回退到活着的 managed service，最后回退到配置端口。
- 同步删掉旧抽象与冗余语义：
  - 删除 [`packages/nextclaw/src/cli/utils.ts`](../../../packages/nextclaw/src/cli/utils.ts) 里原先散落的 `read/write/update/clearServiceState` 与 `read/write/update/clearUiRuntimeState` 一整组 helper。
  - 删除 [`packages/nextclaw/src/cli/commands/service-support/gateway/service-startup-support.ts`](../../../packages/nextclaw/src/cli/commands/service-support/gateway/service-startup-support.ts) 中只转手调用 store 的空心包装函数。
  - 删除 `NEXTCLAW_MANAGED_SERVICE` 环境变量链路。
  - 删除 `ui-runtime.json` 的 `mode` 字段，因为“文件职责”本身已经表达 owner 语义，不需要再额外塞一层解释状态。
- 读取方全部改接清晰边界：
  - [`service.ts`](../../../packages/nextclaw/src/cli/commands/service.ts)、[`runtime.ts`](../../../packages/nextclaw/src/cli/runtime.ts)、[`diagnostics.ts`](../../../packages/nextclaw/src/cli/commands/diagnostics.ts)、[`remote-runtime-support.ts`](../../../packages/nextclaw/src/cli/commands/remote-support/remote-runtime-support.ts)、[`ui-bridge-api.service.ts`](../../../packages/nextclaw/src/cli/commands/shared/ui-bridge-api.service.ts) 现在都直接依赖 store / discovery service，而不是继续通过 `utils.ts` 猜状态语义。
  - `nextclaw stop` 只会停 managed service；当当前只有前台开发态实例时，会稳定输出 `No running background service found.`。

## 测试/验证/验收方式

- 自动化测试：
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/service-support/gateway/tests/service-startup-support.test.ts src/cli/commands/shared/ui-bridge-api.service.test.ts src/cli/commands/remote-support/remote-runtime-support.test.ts src/cli/commands/remote-support/remote-access-host.test.ts src/cli/commands/service-support/runtime/tests/service-managed-startup.test.ts src/cli/commands/service-support/runtime/tests/service-remote-runtime.test.ts`
  - 结果：6 个测试文件、14 个测试全部通过。
- 手动烟雾验证：
  - 使用隔离临时目录作为 `NEXTCLAW_HOME`。
  - 启动前台实例：`NEXTCLAW_HOME=<tmp> pnpm -C packages/nextclaw exec tsx src/cli/index.ts serve --ui-port 59911`
  - 观察运行态文件：只生成 `run/ui-runtime.json`，未生成 `run/service.json`
  - 在同一临时 home 下执行：`NEXTCLAW_HOME=<tmp> pnpm -C packages/nextclaw exec tsx src/cli/index.ts stop`
  - 结果：CLI 输出 `No running background service found.`
  - 随后执行：`curl http://127.0.0.1:59911/api/health`
  - 结果：返回 `{"ok":true,"data":{"status":"ok",...}}`，说明前台实例未被停止。
- 类型检查：
  - `pnpm -C packages/nextclaw tsc`
  - 结果：本次链路通过；当前失败仍来自既有的 [`packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts`](../../../packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts) 第 230、238 行的历史类型问题，与本次改动无关。
- 可维护性守卫：
  - `pnpm lint:maintainability:guard`
  - 结果：本次链路的 maintainability 检查无 error；当前命令最终仍失败，是因为工作区里已有改动触发了与本次无关的 governance 阻断：[`packages/nextclaw-core/src/providers/openai_provider.ts`](../../../packages/nextclaw-core/src/providers/openai_provider.ts) 仍存在 kebab-case 历史命名 warning 与 class-arrow 规则失败。本次涉及的 [`packages/nextclaw/src/cli/commands/diagnostics.ts`](../../../packages/nextclaw/src/cli/commands/diagnostics.ts) 热点说明已在下方补齐。

## 发布/部署方式

- 本次改动为 CLI / 本地运行时隔离修复，不涉及数据库、远程 migration 或额外部署步骤。
- 如需发布，按常规 NextClaw 发版流程合入并执行对应 release 流程即可；本次无需新增环境变量或兼容开关。

## 用户/产品视角的验收步骤

1. 在仓库根目录执行 `pnpm dev start`，等待开发前端和本地后端启动完成。
2. 另开终端执行 `nextclaw stop`。
3. 预期结果：
   - 开发态后端继续存活。
   - Vite 前端不会再出现 `ws proxy error: connect ECONNREFUSED 127.0.0.1:<port>`。
   - CLI 输出应是“没有后台托管服务”，而不是把开发态实例停掉。
4. 执行 `nextclaw start`，确认后台托管服务仍可正常启动。
5. 再执行 `nextclaw stop`，确认这次会正常停止后台托管服务。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。这次没有停留在“给 `stop` 多加一个判断”层面，而是把运行态 owner 真正拆清：后台服务状态归后台服务，前台 UI 发现状态归前台 UI。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。先删旧 helper、删空心包装、删 `mode`、删环境变量，再保留最小必要的两个 store 和一个 discovery service。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：这次做到了净下降。
  - 代码增减报告：
    - 新增：211 行
    - 删除：251 行
    - 净增：-40 行
  - 非测试代码增减报告：
    - 新增：161 行
    - 删除：242 行
    - 净增：-81 行
  - 说明：虽然新增了 3 个 runtime-state owner 文件，并顺手把 `diagnostics.ts` 收敛到 class-arrow 规则要求下，但通过删除 `utils.ts` 中整组状态 helper、删除 `service-startup-support.ts` 的空心包装，以及收敛重复读取逻辑，最终总体和非测试代码都实现了净减少。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰，也更克制。
  - 本次明确保留的 class 只有两个 owner store 和一个 discovery service。
  - 没有引入泛型 `JsonStateStore<T>` 之类“看起来通用、实际上会把语义重新抹平”的过度抽象。
  - 普通函数继续只承担纯工具职责；状态 owner 改由 class 承担，符合当前项目的长期偏好。
- 目录结构与文件组织是否满足当前项目治理要求：部分满足。
  - 本次把状态职责下沉到了 [`packages/nextclaw/src/cli/runtime-state`](../../../packages/nextclaw/src/cli/runtime-state)。
  - 但 [`packages/nextclaw/src/cli/commands/service.ts`](../../../packages/nextclaw/src/cli/commands/service.ts)、[`packages/nextclaw/src/cli/runtime.ts`](../../../packages/nextclaw/src/cli/runtime.ts)、[`packages/nextclaw/src/cli/commands/diagnostics.ts`](../../../packages/nextclaw/src/cli/commands/diagnostics.ts) 仍是历史热点，本次只做了同链路减债，没有顺手扩大成大拆分。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是，已按独立复核填写。

### 长期目标对齐 / 可维护性推进

- 本次顺着“代码更少、边界更清晰、行为更可预测、隐藏耦合更少”的长期方向推进了一小步。
- 本次顺手减债：是。
- 这次真正减掉的债务，不只是 bug 本身，而是“前台开发态实例和后台托管实例共用同一份 owner 状态”的结构性耦合债。
- 仍保留的下一道 seam：
  - `service.ts` 仍是大文件，但本次已经把“状态 owner”这一块从里面抽出。
  - 下一步若继续治理，优先把 `startService()` 剩余的进程拉起、readiness probe、日志诊断三段再下沉。

## 红区触达与减债记录

### packages/nextclaw/src/cli/commands/diagnostics.ts

- 本次是否减债：否，未新增债务但未展开专项减债
- 说明：本次只把 diagnostics 的状态来源切到 `ManagedServiceStateStore`，避免继续依赖 `utils.ts` 的混合状态 helper；为了把 scope 控制在“stop/dev 隔离”这条主链路上，没有同时展开 diagnostics collector 的大拆分。
- 下一步拆分缝：先拆 diagnostics collector、runtime status mapper、user-facing renderer。

### packages/nextclaw/src/cli/commands/service.ts

- 本次是否减债：是，局部减债
- 说明：本次虽然继续触达 `service.ts`，但没有再往里堆 owner 判断，而是把状态读写 owner 抽到 [`runtime-state`](../../../packages/nextclaw/src/cli/runtime-state) 下，并删掉 `service-startup-support.ts` 中只转手调用 store 的包装函数，避免热点文件继续承担错误职责。
- 下一步拆分缝：继续把 `startService()` 中的后台进程拉起、readiness probe、启动失败诊断拆成更窄的 orchestration/support 模块。
