# v0.15.87-agent-loop-removal-ncp-unification

## 迭代完成说明

本次迭代已经把 NextClaw 主执行链收敛成 NCP 单内核，并在此基础上继续把旧 engine / runtime pool 体系整片删除。现在真实用户出口只保留一套执行主链：

- UI Chat 走 `createUiNcpAgent(...)`
- CLI `nextclaw agent` 走 NCP session + run
- Service / Gateway 入站消息走 `runGatewayInboundLoop(...)`
- plugin runtime bridge 走 `dispatchPromptOverNcp(...)`

本轮追加删除与收敛的关键内容：

- 新增整体删除方案文档：
  - [`docs/plans/2026-04-11-agent-loop-removal-implementation-plan.md`](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-11-agent-loop-removal-implementation-plan.md)
  - [`docs/plans/2026-04-11-legacy-engine-removal-implementation-plan.md`](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-11-legacy-engine-removal-implementation-plan.md)
- 删除旧 engine 注册体系：
  - [`packages/nextclaw-core/src/engine/types.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/engine/types.ts)
  - [`packages/nextclaw-core/src/extensions/types.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/extensions/types.ts)
  - [`packages/nextclaw-openclaw-compat/src/plugins/types.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-openclaw-compat/src/plugins/types.ts)
  - [`packages/nextclaw-openclaw-compat/src/plugins/registry.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-openclaw-compat/src/plugins/registry.ts)
  - [`packages/nextclaw-openclaw-compat/src/plugins/loader.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-openclaw-compat/src/plugins/loader.ts)
  - [`packages/nextclaw-openclaw-compat/src/plugins/status.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-openclaw-compat/src/plugins/status.ts)
- 删除两个旧 engine 插件包：
  - `packages/extensions/nextclaw-engine-plugin-codex-sdk`
  - `packages/extensions/nextclaw-engine-plugin-claude-agent-sdk`
- 删除旧 runtime pool：
  - [`packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts)
  - [`packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.command.test.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.command.test.ts)
- 新增 NCP 薄调度 helper：
  - [`packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-dispatch.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-dispatch.ts)
  - [`packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-runtime-lifecycle.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-runtime-lifecycle.ts)
- 同步收敛 direct dispatch / gateway wiring：
  - [`packages/nextclaw/src/cli/commands/agent/cli-agent-runner.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/agent/cli-agent-runner.ts)
  - [`packages/nextclaw/src/cli/commands/service-support/plugin/service-plugin-runtime-bridge.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/plugin/service-plugin-runtime-bridge.ts)
  - [`packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-context.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-context.ts)
  - [`packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-startup.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-startup.ts)
  - [`packages/nextclaw/src/cli/commands/service.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts)
- 更新当前有效架构文档：
  - [`docs/ARCHITECTURE.md`](/Users/peiwang/Projects/nextbot/docs/ARCHITECTURE.md)

本轮没有动存储层兼容桥，因为 session 存储、历史读取与继续追问本身不依赖旧 engine / runtime pool。

## 测试/验证/验收方式

### 已完成自动化验证

- `pnpm -C packages/nextclaw-openclaw-compat tsc`
  - 结果：通过
- `pnpm -C packages/nextclaw-core tsc`
  - 结果：通过
- `pnpm -C packages/nextclaw test -- --run src/cli/commands/ncp/runtime/nextclaw-ncp-runner.test.ts src/cli/commands/service-support/plugin/tests/service-plugin-runtime-bridge.test.ts src/cli/commands/service-support/gateway/tests/service-gateway-bootstrap.test.ts src/cli/commands/service-support/gateway/tests/service-gateway-startup.test.ts src/cli/commands/service-support/gateway/tests/service-capability-hydration.test.ts`
  - 结果：5 个测试文件、13 条测试全部通过
- `rg -n "runtimePool|processDirect\\(|registerEngine|engineKinds|AgentEngine|GatewayAgentRuntimePool" packages/nextclaw packages/nextclaw-core packages/nextclaw-openclaw-compat --glob '!**/dist/**'`
  - 结果：零命中
- `rg -n "nextclaw-engine-plugin-codex-sdk|nextclaw-engine-plugin-claude-agent-sdk|agent-runtime-pool|GatewayAgentRuntimePool|registerEngine|engineKinds" docs/ARCHITECTURE.md packages/nextclaw/src/cli/commands/README.md docs/USAGE.md packages/nextclaw/resources/USAGE.md`
  - 结果：零命中

### 已执行但未全绿的验证

- `pnpm -C packages/nextclaw tsc`
  - 结果：未通过
  - 阻塞点 1：[`packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts)
  - 阻塞点 2：[`packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts)
  - 判断：两处都是当前工作区已有的类型问题，不是本轮旧 engine / runtime pool 删除链路引入
- `pnpm lint:maintainability:guard`
  - 结果：未通过
  - 阻塞点：[`packages/nextclaw-core/src/providers/openai_provider.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts) 的既有复杂度问题
  - 说明：[`packages/nextclaw/src/cli/commands/service.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts) 当前仍有 file-budget warning，但已不是本轮 guard 的 error 阻塞项
  - 判断：guard 失败仍主要来自与本轮无关的 `openai_provider.ts` 存量债务

### 推荐手工验收

1. CLI 单轮：
   - `NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-agent-cli-once.XXXXXX) pnpm -C packages/nextclaw dev:build agent -m "Reply exactly OK" --session cli:remove-legacy-engine-once`
   - 预期：正常返回 `OK`
2. CLI 交互式：
   - `NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-agent-cli-chat.XXXXXX) pnpm -C packages/nextclaw dev:build agent --session cli:remove-legacy-engine-chat`
   - 预期：可多轮追问，可正常 `exit`
3. Service / Gateway：
   - 启动 service 后从真实渠道或 UI 发一条普通消息
   - 预期：仍能收到 reset / delta / final reply
4. 插件桥附件：
   - 走带图片或文件的 plugin runtime 流程
   - 预期：仍能正常转成 NCP 附件输入并返回结果
5. 历史会话继续追问：
   - 打开已有 session 后继续发送一条消息
   - 预期：历史仍可读取，session 存储没有因为 runtime pool 删除而损坏

## 发布/部署方式

本次改动不涉及数据库、远程 migration 或额外部署脚本。

发布前建议顺序：

1. 先处理当前仓库里与本次删除无关但会阻断全量验证的既有问题：
   - [`packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts)
   - [`packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts)
   - [`packages/nextclaw-core/src/providers/openai_provider.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts)
2. 重新执行：
   - `pnpm -C packages/nextclaw-openclaw-compat tsc`
   - `pnpm -C packages/nextclaw-core tsc`
   - `pnpm -C packages/nextclaw tsc`
   - `pnpm lint:maintainability:guard`
3. 完成 CLI / Service / Plugin Bridge 的手工冒烟后，再走现有发布流程

## 用户/产品视角的验收步骤

从真实用户出口看，这轮要确认的不是“旧代码删得漂不漂亮”，而是“主功能入口没崩，而且只剩单路径”：

1. `nextclaw agent -m` 能正常回复
2. `nextclaw agent` 交互式模式可多轮会话
3. UI Chat 正常发送、流式显示、继续追问
4. Gateway 接入的真实渠道消息还能收到回复
5. 插件桥带文本或附件的消息仍能正常处理
6. 旧 session 历史仍能读取并继续追问
7. 仓库 live code 中已不存在旧 engine 注册链、旧 engine 插件包与 `agent-runtime-pool`

如果以上 7 项成立，就可以判定“旧 AgentLoop / engine / runtime pool 体系已被删干净，而且没有把真实用户出口一起删坏”。

## 可维护性总结汇总

### 长期目标对齐 / 可维护性推进

本次继续顺着“代码更少、执行核心更少、边界更清晰、体验更统一”的长期方向推进了一步，而且是实打实的收敛：

- 双执行核心彻底收敛成 NCP 单执行核心
- 插件注册面只保留真实在用的 NCP runtime
- Service / Gateway / CLI / 插件桥复用同一套 dispatch 合同

### 可维护性复核结论

- 结论：本轮已按删除优先完成主链收敛，保留债务经说明接受
- 本次顺手减债：是
- 独立复核判断：这轮没有把复杂度换个位置保留，而是把一整套 legacy engine / runtime pool 体系从 live code 里直接拿掉

### 代码增减报告

以下统计范围为“本轮 legacy engine / runtime pool 删除 sweep”对应的相关代码文件：

- 新增：267 行
- 删除：2869 行
- 净增：-2602 行

说明：新增主要是更薄的 NCP dispatch / lifecycle helper；删除主要来自旧 engine 注册链、两个旧 engine 插件包与 `agent-runtime-pool`。

### 非测试代码增减报告

以下统计同样只覆盖本轮相关非测试代码文件：

- 新增：246 行
- 删除：2006 行
- 净增：-1760 行

说明：非测试代码仍然是显著净删除，这轮不是“为了重构而搬家”，而是把历史抽象直接砍掉了。

### 逐项判断

- 本次是否已尽最大努力优化可维护性：
  - 是；本轮问题域里的旧 engine 注册面、旧插件包与 runtime pool 已按单路径原则成批删除
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：
  - 是；没有保留 fallback，也没有再造一个新的 pool 去替代旧 pool
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：
  - 是；总代码与非测试代码都显著下降，旧插件包和旧中间层文件被整批删除
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰：
  - 是；gateway inbound、direct dispatch、runtime cleanup 都回到了更薄、更直接的 NCP helper 上
- 目录结构与文件组织是否满足当前项目治理要求：
  - 基本满足；本轮删除没有继续制造平铺，且主动减少了一个历史命令层级与两个插件包

### 本次仍保留的维护性债务

1. [`packages/nextclaw-core/src/providers/openai_provider.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts) 的既有复杂度仍阻断全仓 maintainability guard
2. [`packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts) 当前工作区还有与本轮无关的类型问题
3. [`packages/nextclaw/src/cli/commands/service.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts) 当前仍有 file-budget warning，但本轮避免为了清 warning 再扩 scope
4. 历史计划、设计与度量快照文档中仍会出现旧名词留痕，但它们不再代表 live architecture

### 为什么本次接受这些债务

- 它们不是这轮“删掉旧 engine / runtime pool 体系”的直接 blocker
- 继续处理会把范围扩散到用户当前别的改动链路，不符合这次“大胆删除旧体系，但不顺手误改其它出口”的边界

### 下一步最合适的切口

1. 单独处理 [`packages/nextclaw-core/src/providers/openai_provider.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts) 的复杂度债务
2. 单独处理 [`packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime-state/local-ui-discovery.service.ts) 的类型问题，恢复 `packages/nextclaw tsc`
3. 等用户当前 `service.ts` 相关并行改动稳定后，再单独做一轮 service 命令可维护性收敛
4. 如需进一步“删到文档和度量快照都不出现旧名词”，可以再单开一轮历史文档清理，不与主代码链路混做
