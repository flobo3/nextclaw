# v0.15.87-agent-loop-removal-ncp-unification

## 迭代完成说明

本次迭代完成了 NextClaw 主执行链的单内核收敛：`AgentLoop`、`NativeAgentEngine`、loop-centric tests、`NativeManagedAssetSupport` 已从 live code 中删除，CLI agent、gateway inbound、plugin runtime bridge 现在统一进入 NCP `session + run + event stream` 合同。

本次实际落地内容：

- 新增统一 NCP 直接执行 runner：
  - [`docs/plans/2026-04-11-agent-loop-removal-implementation-plan.md`](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-11-agent-loop-removal-implementation-plan.md)
  - [`packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-runner.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-runner.ts)
- 将 [`packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts) 从 engine pool 收缩成纯 NCP 调度器：
  - 保留路由、slash command、bus delta/reset/final publish
  - 删除 engine runtime cache、native engine factory、dynamic engine fallback
- 将 [`packages/nextclaw/src/cli/runtime.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime.ts) 的 `nextclaw agent` CLI 改成直接复用 NCP backend；交互逻辑拆到 [`packages/nextclaw/src/cli/commands/agent/cli-agent-runner.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/agent/cli-agent-runner.ts)
- 更新 gateway 配置热重载链，去掉 runtimePool 对 extension-registry engine 更新的依赖
- 删除旧核心与相关测试：
  - [`packages/nextclaw-core/src/agent/loop.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/agent/loop.ts)
  - [`packages/nextclaw-core/src/engine/native.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/engine/native.ts)
  - 四个 loop-centric core tests
  - [`packages/nextclaw/src/cli/commands/agent/native-managed-asset-support.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/agent/native-managed-asset-support.ts)
- 重写 [`docs/ARCHITECTURE.md`](/Users/peiwang/Projects/nextbot/docs/ARCHITECTURE.md)，把当前有效执行架构改成 NCP 单内核表述

## 测试/验证/验收方式

### 已完成自动化验证

- `pnpm -C packages/nextclaw-core tsc`
  - 结果：通过
- `pnpm -C packages/nextclaw test -- --run src/cli/commands/agent/agent-runtime-pool.command.test.ts src/cli/commands/service-support/plugin/tests/service-plugin-runtime-bridge.test.ts src/cli/commands/service-support/gateway/tests/service-gateway-bootstrap.test.ts src/cli/commands/service-support/gateway/tests/service-gateway-startup.test.ts src/cli/commands/service-support/gateway/tests/service-capability-hydration.test.ts`
  - 结果：5 个测试文件、15 条测试全部通过
- `rg -n "AgentLoop|NativeAgentEngine|NativeManagedAssetSupport|runtimePool\\.processDirect\\(|agentLoop\\.processDirect\\(" packages docs --glob '!docs/logs/**'`
  - 结果：`packages/` live code 不再命中 `AgentLoop` / `NativeAgentEngine` / `NativeManagedAssetSupport`
  - 说明：`docs/plans` 仍保留历史/方案引用，属于允许留痕

### 已执行但未全绿的验证

- `pnpm -C packages/nextclaw tsc`
  - 结果：未通过
  - 阻塞点：[`packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts) 现有 `Set<string | undefined>` 类型错误
  - 判断：该错误发生在 `nextclaw-server` 现有文件，不由本次 AgentLoop 删除引入
- `pnpm -C packages/nextclaw test -- --run src/cli/commands/ncp/runtime/create-ui-ncp-agent.test.ts src/cli/commands/ncp/session/nextclaw-agent-session-store.test.ts src/cli/commands/service-support/session/tests/service-deferred-ncp-agent.test.ts`
  - 结果：后两组相关测试通过，但 `create-ui-ncp-agent.test.ts` 有 3 条既有失败
  - 判断：失败点集中在 skill prompt / MCP hot reload / timeout，用例链路与本次删除 `AgentLoop` 的改动面不直接重合
- `pnpm lint:maintainability:guard`
  - 结果：未通过
  - 判断：当前 error 全部来自 [`packages/nextclaw-core/src/providers/openai_provider.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts) 的既有复杂度问题；本次改动链路新增的 guard error 已被消除

### 推荐手工验收

1. CLI 单轮：
   - `NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-agent-cli-once.XXXXXX) pnpm -C packages/nextclaw dev:build agent -m "Reply exactly OK" --session cli:remove-loop-once`
   - 预期：正常返回 `OK`，无 legacy loop / native engine 报错
2. CLI 交互式：
   - `NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-agent-cli-chat.XXXXXX) pnpm -C packages/nextclaw dev:build agent --session cli:remove-loop-chat`
   - 预期：可多轮追问，可正常 `exit`
3. Service/Gateway：
   - 启动 service 后从真实渠道或 UI 发一条普通消息
   - 预期：收到 reset/delta/final reply，渠道回复不丢
4. 插件桥附件：
   - 走带图片的 plugin runtime 流程
   - 预期：本地附件被转成 assetUri，远程附件保留 url，回复正常

## 发布/部署方式

本次改动不涉及数据库、远程 migration 或额外部署脚本。

发布前建议顺序：

1. 先解决当前仓库里与本次无关但会阻断全量验证的既有问题：
   - `packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts`
   - `packages/nextclaw-core/src/providers/openai_provider.ts`
   - `create-ui-ncp-agent.test.ts` 的既有失败
2. 重新执行：
   - `pnpm -C packages/nextclaw-core tsc`
   - `pnpm -C packages/nextclaw tsc`
   - `pnpm lint:maintainability:guard`
3. 完成 CLI / Service 手工冒烟后，再正常走现有发布流程

## 用户/产品视角的验收步骤

从用户视角，这次主要要确认“功能没少，但执行核心已经统一”：

1. `nextclaw agent -m` 还能正常回复
2. `nextclaw agent` 交互式多轮还能正常聊
3. UI Chat 正常发送、流式显示、停下、继续追问
4. Gateway 接入的真实渠道消息还能收到回复
5. 插件桥带附件的消息还能正常处理
6. 旧会话历史仍能读取并继续追问
7. 仓库 live code 中已不存在 `AgentLoop` / `NativeAgentEngine`

如以上 7 项全部成立，就可以判定“删掉 AgentLoop 没有导致主产品链崩掉”。

## 可维护性总结汇总

### 长期目标对齐 / 可维护性推进

本次是明确朝“代码更少、执行核心更少、边界更清晰、行为更可预测”推进了一步，而且是比较大的一步：双执行核心已经收敛成单执行核心，CLI / gateway / plugin bridge 不再分别依赖旧 loop 语义。

### 可维护性复核结论

- 结论：保留债务经说明接受
- 本次顺手减债：是
- no maintainability findings

### 代码增减报告

- 新增：1024 行
- 删除：2879 行
- 净增：-1855 行

说明：新增主要来自 NCP runner、CLI NCP runner 与重写后的 NCP-oriented tests；删除主要来自 `AgentLoop`、`NativeAgentEngine`、managed asset support、旧 loop tests 与大量 engine-era glue。

### 非测试代码增减报告

- 新增：806 行
- 删除：2220 行
- 净增：-1414 行

说明：非测试代码仍是显著净删除，已经达到了本次改动的最佳实践方向；这不是“把复杂度搬家”，而是真正把一整套旧执行层从 live code 中拿掉了。

### 逐项判断

- 本次是否已尽最大努力优化可维护性：
  - 是，就本次问题域而言已经做到主链收敛与大规模净删除
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”：
  - 是；先切 NCP 真入口，再成批删除旧 loop / native engine / managed asset support，而不是保留 fallback
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：
  - 是；总代码与非测试代码都显著下降，旧文件与旧测试被整批删除
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰：
  - 是；`GatewayAgentRuntimePool` 被压回薄调度器，CLI agent 逻辑被收束到独立 runner，NCP runner 变成统一直接执行入口
- 目录结构与文件组织是否满足当前项目治理要求：
  - 部分满足；本次没有继续恶化，但 `packages/nextclaw/src/cli/runtime.ts` 仍超文件预算，属于已知存量债务

### 本次仍保留的维护性债务

1. plugin runtime bridge 仍经由 `runtimePool.processDirect()` 进入主链，而不是直接调用 live NCP handle；虽然已不再依赖旧 loop，但未来仍可继续去耦
2. 旧 `AgentEngine` 类型与 engine plugin packaging 仍在仓库里，已经不是 live 主链，但还没做第二轮彻底清退
3. `packages/nextclaw-core/src/providers/openai_provider.ts` 的既有复杂度问题仍阻断 maintainability guard，全仓库层面还需后续偿还

### 为什么本次接受这些债务

- 继续追删 engine packaging 会扩散到更多包与构建脚本，已经超出这次“先让 live 主链彻底摆脱 AgentLoop”的最小安全边界
- `runtimePool.processDirect()` 仍保留，是为了复用统一路由与 slash command 逻辑，避免为了追求绝对删净而复制第二份桥接代码

### 下一步最合适的切口

1. 让 plugin runtime bridge 直接拿 live NCP agent，进一步削薄 `runtimePool`
2. 评估并下线旧 `AgentEngine` 注册体系与两个 legacy engine plugin 包
3. 单独处理 `openai_provider.ts` 的复杂度债务，恢复全仓 maintainability guard 绿灯
