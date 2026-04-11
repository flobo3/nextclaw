# 旧 AgentLoop / Engine / RuntimePool 整体删除实施方案

> 执行原则：删减优先、简化优先、单路径优先；不为旧 engine、旧 runtime pool、旧兼容桥保留 fallback。

**Goal:** 彻底删除 NextClaw 里已失效的 `AgentLoop` 后续遗留、legacy engine 注册体系、两个旧 engine 插件包与 `agent-runtime-pool`，让 CLI、Service、Gateway、插件桥都只复用 NCP 这一套真实执行主链。

**Architecture:** NextClaw 作为统一入口，不应该继续维护两套执行核心。保留真实对外出口仍在使用的 NCP runtime 与 session 存储链路，把旧 engine 抽象、旧插件注册面、旧 runtime pool 中间层整片铲掉，最后把 direct dispatch 与 gateway inbound loop 收敛成 NCP helper。

**Tech Stack:** TypeScript、pnpm workspace、NextClaw CLI/Service、NCP runtime、OpenClaw compat plugin loader。

---

## 长期目标对齐 / 可维护性推进

这次删除不是“技术洁癖式重构”，而是在兑现 NextClaw 作为统一入口的产品方向：

- 用户只该面对一套稳定的执行主链，而不是历史 loop 与 NCP 并存。
- 插件体系只该暴露仍然真实存在的运行时扩展面，而不是继续把已废弃的 engine API 留给后来人误用。
- Service / Gateway / CLI / 插件桥应该复用同一份执行合同，而不是通过一个历史过渡层绕一圈。

这轮工作的默认判断是：

1. 先问能删什么，再问能怎样简化。
2. 不能因为“还有模块 import 它”就保留；如果依赖它的模块本身没有用户出口价值，就一起删。
3. 不接受“先走 NCP，失败再掉回旧 loop”这类双轨兼容。

## 主合同与删除边界

### 主合同

本次要守住的真实合同只有一条：

- `NCP session + run + event stream`

所有真实用户出口都必须继续通过它工作：

- `nextclaw agent`
- Service / Gateway 入站消息
- UI Chat 关联的服务侧 NCP agent
- plugin runtime bridge

### 明确保留

以下内容虽然和旧执行链相邻，但不是本次删除目标，且当前仍有真实价值，因此保留：

- `packages/extensions/nextclaw-ncp-runtime-codex-sdk`
- `packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk`
- `packages/extensions/nextclaw-ncp-runtime-claude-code-sdk`
- `packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk`
- `SessionManager`、NCP session store、历史读取、消息格式桥、配置写回
- UI 现有 `createUiNcpAgent(...)` 主链

### 明确删除

以下内容已经不再是用户出口的必要组成，因此直接删除，不保留过渡桥：

- `AgentLoop` / `NativeAgentEngine` 遗留类型与导出
- `ExtensionRegistry.engines`
- OpenClaw plugin API 中的 `registerEngine`
- `PluginRegistry.engines`
- `PluginRecord.engineKinds`
- `reservedEngineKinds`
- 两个旧 engine 插件包
  - `packages/extensions/nextclaw-engine-plugin-codex-sdk`
  - `packages/extensions/nextclaw-engine-plugin-claude-agent-sdk`
- `packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts`
- 只为上述旧体系存在的测试、脚本、构建命令与文档表述

## 为什么存储层不需要跟着删

本次删除判断里，存储层是“保留且不需要兼容桥处理”的项：

- session 存储绑定的是 `SessionManager` 与 NCP session store，不是 `AgentLoop`
- 历史消息读取、会话继续追问、配置写回并不依赖旧 engine 注册体系
- 因此删除 `agent-runtime-pool`、engine types、engine plugins，不会天然破坏 session 持久化

这也是本次敢于彻底删除的前提之一。

## 整体实施方案

### 任务 1：删除旧 engine 注册面

**Files:**

- Modify: `packages/nextclaw-core/src/extensions/types.ts`
- Modify: `packages/nextclaw-core/src/index.ts`
- Modify: `packages/nextclaw-openclaw-compat/src/plugins/types.ts`
- Modify: `packages/nextclaw-openclaw-compat/src/plugins/registry.ts`
- Modify: `packages/nextclaw-openclaw-compat/src/plugins/loader.ts`
- Modify: `packages/nextclaw-openclaw-compat/src/plugins/status.ts`
- Modify: `packages/nextclaw-openclaw-compat/src/plugins/plugin-capability-registration.ts`
- Modify: `packages/nextclaw-openclaw-compat/src/plugins/plugin-loader-utils.ts`
- Modify: `packages/nextclaw-openclaw-compat/src/plugins/progressive-plugin-loader/progressive-plugin-loader-context.ts`
- Modify: `packages/nextclaw/src/cli/commands/plugin/plugin-extension-registry.ts`
- Modify: `packages/nextclaw/src/cli/commands/plugin/plugin-registry-loader.ts`
- Modify: `packages/nextclaw/src/cli/commands/plugin/plugin-command-utils.ts`

**执行动作：**

1. 删除 `AgentEngineFactory` 等旧 engine 类型对外暴露。
2. 删除 OpenClaw plugin API 里的 `registerEngine` 与相关注册对象。
3. 让 plugin registry 只保留：
   - `tools`
   - `channels`
   - `providers`
   - `ncpAgentRuntimes`
4. 让 NextClaw extension registry 只继续映射真实还在用的能力面。

**完成标准：**

- live code 中不再出现 `registerEngine`、`engineKinds`、`reservedEngineKinds`、`AgentEngine*`。

### 任务 2：删除旧 engine 插件包

**Files:**

- Delete: `packages/extensions/nextclaw-engine-plugin-codex-sdk/*`
- Delete: `packages/extensions/nextclaw-engine-plugin-claude-agent-sdk/*`
- Modify: `package.json`

**执行动作：**

1. 直接删除两个旧 engine 插件包目录。
2. 从根 `build` / `lint` / `tsc` 脚本中移除它们。
3. 清理仓库里对这两个包的 live code 引用。

**完成标准：**

- workspace 不再构建、lint、tsc 这两个旧插件包。
- 仓库 live code 不再引用这两个包。

### 任务 3：删除 `agent-runtime-pool`

**Files:**

- Delete: `packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts`
- Delete: `packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.command.test.ts`
- Add: `packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-dispatch.ts`
- Modify: `packages/nextclaw/src/cli/commands/agent/cli-agent-runner.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/plugin/service-plugin-runtime-bridge.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-context.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-bootstrap.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-startup.ts`
- Add: `packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-runtime-lifecycle.ts`
- Modify: `packages/nextclaw/src/cli/commands/service.ts`

**执行动作：**

1. 把 direct prompt 场景收敛到 `dispatchPromptOverNcp(...)`。
2. 把 gateway inbound 消费收敛到 `runGatewayInboundLoop(...)`。
3. 把 runtime cleanup / deferred startup error 处理移到更薄的 gateway lifecycle helper。
4. 让 Service wiring 直接装配 NCP runtime loop，不再经过 runtime pool class。

**完成标准：**

- live code 中不再存在 `GatewayAgentRuntimePool`、`agent-runtime-pool`、`processDirect(...)` 这套旧入口。

### 任务 4：同步文档与验收说明

**Files:**

- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/logs/v0.15.87-agent-loop-removal-ncp-unification/README.md`
- Modify: `docs/plans/2026-04-11-agent-loop-removal-implementation-plan.md`
- Modify: `docs/plans/2026-04-11-legacy-engine-removal-implementation-plan.md`

**执行动作：**

1. 把当前有效架构明确写成 NCP 单执行核心。
2. 在迭代日志里写清这轮新增删除范围、验证结果、手工验收步骤与剩余仓库阻断。
3. 保留历史计划/设计文档作为时间线留痕，但不把它们再当成当前 live architecture。

**完成标准：**

- 当前有效文档不再把 `AgentLoop`、旧 engine 或 runtime pool 描述成主执行链。

## 不做的事

本轮明确不做以下事情，避免无边界扩散：

- 不删除正在用的 NCP runtime 插件包
- 不重写 session 存储层
- 不为了兼容历史插件而恢复旧 engine 注册 API
- 不为了“更稳妥”额外加 fallback 或双轨
- 不顺手处理与本轮无关的仓库存量复杂度债务
  - 例如 `packages/nextclaw-core/src/providers/openai_provider.ts`
  - 例如 `packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts`

## 风险与判定

### 真实风险

1. direct prompt 路由切到 NCP 后，CLI / plugin bridge 可能失效
2. gateway inbound loop 改写后，渠道消息可能无法发出 reset / delta / final
3. deferred startup 与实时会话桥 wiring 可能在 service 中断裂

### 非风险项

以下内容不应被误判为本次删除 blocker：

- session 持久化文件格式
- 会话历史读取
- NCP session store
- 正在用的 Codex / Claude Code NCP runtime 插件

## 验证方案

### 自动化验证

1. `pnpm -C packages/nextclaw-openclaw-compat tsc`
2. `pnpm -C packages/nextclaw-core tsc`
3. `pnpm -C packages/nextclaw test -- --run src/cli/commands/ncp/runtime/nextclaw-ncp-runner.test.ts src/cli/commands/service-support/plugin/tests/service-plugin-runtime-bridge.test.ts src/cli/commands/service-support/gateway/tests/service-gateway-bootstrap.test.ts src/cli/commands/service-support/gateway/tests/service-gateway-startup.test.ts src/cli/commands/service-support/gateway/tests/service-capability-hydration.test.ts`
4. `pnpm -C packages/nextclaw tsc`
5. `pnpm lint:maintainability:guard`

### 残留搜索

至少执行：

1. `rg -n "registerEngine|PluginEngineRegistration|ExtensionEngineRegistration|AgentEngineFactory|AgentEngineDirectRequest|AgentEngineInboundRequest|AgentEngineFactoryContext|\\bAgentEngine\\b|engineKinds|reservedEngineKinds|GatewayAgentRuntimePool|agent-runtime-pool|nextclaw-engine-plugin-codex-sdk|nextclaw-engine-plugin-claude-agent-sdk|NativeAgentEngine|AgentLoop" packages docs package.json --glob '!docs/logs/**' --glob '!**/dist/**'`
2. `rg -n "runtimePool|processDirect\\(|registerEngine|engineKinds|AgentEngine|GatewayAgentRuntimePool" packages/nextclaw packages/nextclaw-core packages/nextclaw-openclaw-compat --glob '!**/dist/**'`

**判定标准：**

- 第一条命令允许命中历史计划/设计文档
- 第二条命令在 live code 中应为零命中

### 用户/产品视角验收

1. CLI 单轮消息仍能正常回复
2. CLI 交互式多轮仍能继续会话
3. UI Chat 仍能新建会话、发送消息、继续追问
4. Service / Gateway 真实入站消息仍能收到 reset / delta / final
5. plugin runtime bridge 传文本或附件时仍能得到回复
6. 已有 session 历史仍可读取并继续追问

## 完成标准

只有同时满足以下条件，才算这轮删干净：

1. live code 中不再存在旧 engine 注册链
2. 两个旧 engine 插件包已删除
3. `agent-runtime-pool` 已删除
4. CLI / Service / Gateway / plugin bridge 统一复用 NCP 执行链
5. session 存储与历史继续追问未被破坏
6. 当前有效文档已完成同步
