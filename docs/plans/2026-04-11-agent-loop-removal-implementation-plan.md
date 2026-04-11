# AgentLoop 彻底移除实施方案

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 彻底移除 `AgentLoop` 与 `NativeAgentEngine`，让 NextClaw 的 UI Chat、CLI agent、gateway/channel inbound、plugin runtime bridge、后台自动执行全部收敛到 NCP 这一套唯一执行核心。

**架构方案：** 保留已经成立的 NCP-native UI/session backend 作为唯一执行真相源，把仍然停留在 direct-exec / native engine / loop 语义上的入口逐个切到统一的 `session + run + event stream` 合同；不保留双轨执行，不保留隐藏 fallback，不保留“先试 NCP，失败再掉回 AgentLoop”的兼容路径。等最后一个 live caller 迁走后，成批删除 `AgentLoop`、`NativeAgentEngine`、旧导出、旧测试、旧架构描述。

**技术栈：** TypeScript、Vitest、NextClaw core/runtime/service packages、NCP runtime/backend/toolkit、Markdown 文档。

---

## 长期目标对齐 / 可维护性推进

这次工作的根目标不是“把一段旧代码换个入口继续活着”，而是彻底消灭双执行核心。只要 `AgentLoop` 和 NCP 继续并存，NextClaw 就会长期处在：

- 产品主语不统一
- 执行合同不统一
- 新功能接入要反复判断接哪套执行链
- 修 bug 时天然更倾向于继续补双轨逻辑

本方案默认遵循以下优先级：

1. 删除双轨，比保留兼容更重要。
2. 删除旧代码，比最小 diff 更重要。
3. 删除 fallback，比“看起来稳妥”更重要。
4. 统一成单执行合同，比保留历史 direct API 更重要。
5. 任何新增过渡代码，都必须以“能删掉更多旧代码”为唯一正当性。

## 结论

### 应不应该删

应该删，而且应该尽快删。

### 能不能删

能删。当前真正的阻碍不是 session 存储，而是仍有几处 live execution caller 直接绑着 `AgentLoop`。

### 推荐删法

唯一推荐方案是：

1. 先补足统一的 NCP 执行 runner。
2. 再逐个切掉还在调用 `AgentLoop` 的执行入口。
3. 最后一次性删除 `AgentLoop` / `NativeAgentEngine` / 旧测试 / 旧导出 / 旧文档。

### 不推荐删法

不推荐现在直接裸删 `AgentLoop` 文件本体。

原因不是 session 会坏，而是这些入口会直接炸：

- CLI agent
- gateway/channel inbound
- plugin runtime bridge

这不是删减优先，而是先制造崩溃再返工。

## 执行合同

### 唯一执行合同

NextClaw 的执行合同统一为：

- 输入：`sessionId + NcpMessage + metadata`
- 执行：`runApi.send(...)` 或等价的 NCP agent endpoint `send/stream`
- 输出：NCP event stream 与最终 assistant message

### 观察接口与执行接口边界

- observation：
  - `listSessionTypes`
  - `sessionApi.get/list/messages`
- execution：
  - `runApi.send`
  - `agentClientEndpoint.send`
  - `agentClientEndpoint.stream`
  - `agentClientEndpoint.abort`

禁止 observation 接口带执行副作用，禁止 execution 接口在失败时静默回落到 `AgentLoop`。

## 当前阻塞位点

当前真正阻止删除 `AgentLoop` 的 live callers：

- [`packages/nextclaw/src/cli/runtime.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime.ts)
  - `nextclaw agent` / 交互 CLI 仍直接 `agentLoop.processDirect(...)`
- [`packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts)
  - gateway/channel inbound 仍走 `NativeAgentEngine -> AgentLoop`
- [`packages/nextclaw/src/cli/commands/service-support/plugin/service-plugin-runtime-bridge.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/plugin/service-plugin-runtime-bridge.ts)
  - plugin runtime bridge 仍调用 `runtimePool.processDirect(...)`
- [`packages/nextclaw-core/src/engine/native.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/engine/native.ts)
  - `NativeAgentEngine` 本体直接包装 `AgentLoop`
- [`packages/nextclaw-core/src/index.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/index.ts)
  - 仍对外导出 `AgentLoop` 与 native engine

## 不是阻塞项的内容

这些内容不是删 `AgentLoop` 的 blocker，可以后置：

- [`packages/nextclaw/src/cli/commands/ncp/nextclaw-agent-session-store.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/ncp/nextclaw-agent-session-store.ts)
- [`packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-message-bridge.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-message-bridge.ts)

原因：它们依赖的是 `SessionManager` 与消息格式适配，不是 `AgentLoop` 本体。

## 最终目标删除清单

只要迁移完成，就应该直接瞄准以下删除：

- Delete: `packages/nextclaw-core/src/agent/loop.ts`
- Delete: `packages/nextclaw-core/src/engine/native.ts`
- Modify: `packages/nextclaw-core/src/index.ts`
- Modify: `packages/nextclaw-core/src/engine/types.ts`
- Delete or rewrite:
  - `packages/nextclaw-core/src/agent/tests/loop.additional-tools.test.ts`
  - `packages/nextclaw-core/src/agent/tests/loop.inbound-stream.test.ts`
  - `packages/nextclaw-core/src/agent/tests/loop.system-message.test.ts`
  - `packages/nextclaw-core/src/agent/tests/loop.tool-catalog.test.ts`
- Rewrite:
  - `docs/ARCHITECTURE.md`
  - `docs/USAGE.md`

## 迁移原则

1. 只保留一套执行真相源：NCP。
2. 不新增 runtime fallback。
3. 不保留 “NCP 不可用时自动掉回 `AgentLoop`”。
4. 不新造第三套中间层。
5. 每切完一个入口，顺手删掉这一入口对应的旧路径。
6. 允许保留纯路由、纯展示、纯持久化桥，但不允许保留第二套执行核心。

## 影响面矩阵

下面这些功能都可能受本次删除影响，必须纳入验证范围。

| 功能域 | 受影响原因 | 需要验证的核心事实 |
| --- | --- | --- |
| UI Chat | 已是 NCP 主链，但会受共享 runner / 执行合同调整影响 | 发送、流式回复、停止、附件、session 切换都正常 |
| CLI 单轮对话 | 当前直接走 `AgentLoop.processDirect()` | `nextclaw agent -m` 改走 NCP 后仍能得到正确回复 |
| CLI 交互式对话 | 当前直接 new `AgentLoop` | 多轮会话、复用 session、退出行为正常 |
| gateway/channel inbound | 当前走 `NativeAgentEngine -> AgentLoop` | 入站消息仍能路由到正确 agent / session 并正常回复 |
| plugin runtime bridge | 当前调 `runtimePool.processDirect(...)` | 插件桥仍能把文本和附件送进统一 NCP 执行链 |
| cron / heartbeat | 已逐步切到 NCP，但要防止本次重构回退 | 继续只走 NCP，不被重新拉回旧直驱 |
| abort / stop | 原本部分能力挂在 engine 上 | UI/CLI 停止行为不退化，不出现“假停止” |
| session 存储与历史读取 | 执行核心替换后仍要复用历史会话 | 历史消息可读、继续追问正常、metadata 不丢 |
| tool / skill / context 注入 | 原本一部分测试是 loop-centric | NCP 运行时仍具备真实的工具、skill、context 注入 |
| 架构与对外文档 | 旧文档仍把 AgentLoop 当执行核心 | 当前有效文档不再误导 |

## 验证总策略

验证必须分四层做，不能只跑单元测试：

1. **定向单元/集成测试**
   - 用来保护每个切换点的合同不漂移
2. **类型检查**
   - 用来兜住大规模删除后的引用残留
3. **真实链路冒烟**
   - 用来证明用户可见行为仍成立
4. **仓库级残留搜索**
   - 用来证明旧执行核心真的被删干净，而不是换个文件名继续活着

## 自动化验证清单

### A. 定向测试

这些测试是本次最小充分自动化验证集：

- plugin runtime bridge
  - `pnpm -C packages/nextclaw test -- --run src/cli/commands/service-support/plugin/tests/service-plugin-runtime-bridge.test.ts`
- gateway runtime / routing
  - `pnpm -C packages/nextclaw test -- --run src/cli/commands/agent/agent-runtime-pool.command.test.ts`
- service startup / deferred NCP runtime
  - `pnpm -C packages/nextclaw test -- --run src/cli/commands/service-support/gateway/tests/service-gateway-bootstrap.test.ts src/cli/commands/service-support/gateway/tests/service-gateway-startup.test.ts src/cli/commands/service-support/session/tests/service-deferred-ncp-agent.test.ts`
- NCP runtime 主链
  - `pnpm -C packages/nextclaw test -- --run src/cli/commands/ncp/runtime/create-ui-ncp-agent.test.ts src/cli/commands/ncp/runtime/create-ui-ncp-agent.claude.test.ts src/cli/commands/ncp/runtime/create-ui-ncp-agent.reasoning-normalization.test.ts src/cli/commands/ncp/runtime/create-ui-ncp-agent.child-session-request.test.ts src/cli/commands/ncp/runtime/create-ui-ncp-agent.subagent-completion.test.ts`
- session store / 历史兼容桥
  - `pnpm -C packages/nextclaw test -- --run src/cli/commands/ncp/session/nextclaw-agent-session-store.test.ts`
- 新增 CLI NCP agent mode 测试
  - `pnpm -C packages/nextclaw test -- --run src/cli/runtime.agent-mode.test.ts`

### B. 类型检查

- `pnpm -C packages/nextclaw-core tsc`
- `pnpm -C packages/nextclaw tsc`
- 必要时补：
  - `pnpm -C packages/nextclaw-server tsc`

### C. 维护性守卫

- `pnpm lint:maintainability:guard`
- 如果守卫因为无关历史问题失败，必须明确区分：
  - 本次改动相关阻断
  - 仓库既有无关阻断

### D. 残留搜索

至少跑以下搜索：

- `rg -n "AgentLoop|NativeAgentEngine" packages docs --glob '!docs/logs/**'`
- `rg -n "runtimePool\\.processDirect\\(|agentLoop\\.processDirect\\(" packages docs --glob '!docs/logs/**'`

预期结果：

- `packages/` 下不应再命中 live code
- `docs/` 下只允许历史计划和历史迭代留痕

## 手工验收清单

下面这些是改完后必须逐项手验的功能，不建议省略。

### 1. UI Chat 主链

目标：确认共享执行合同调整后，UI 侧没有回归。

至少验这些动作：

1. 打开聊天页面，新建一个 session。
2. 发送一条最小文本消息，确认有正常回复。
3. 再追问一轮，确认同一 session 能连续对话。
4. 如果支持停止，发送一条较长消息后点击停止，确认不会卡死在运行态。
5. 如果当前环境支持附件，上传一张图片或一个文件，确认消息可发送且执行链不报错。
6. 切换 session 再切回，确认历史仍然存在。

通过标准：

- 能发、能回、能切、能停、历史不丢。

### 2. CLI 单轮对话

目标：确认 `nextclaw agent -m` 已从 `AgentLoop` 切到 NCP，但用户体验不坏。

建议命令：

- `NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-agentloop-remove-cli-once.XXXXXX) pnpm -C packages/nextclaw dev:build agent -m "Reply exactly OK" --session cli:remove-loop-once`

观察点：

- 命令能返回回复
- 输出里没有 legacy direct path 相关报错
- 对应 session 被写入当前 home

### 3. CLI 交互式对话

目标：确认交互模式不再依赖 `AgentLoop`。

建议步骤：

1. 启动：`NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-agentloop-remove-cli-chat.XXXXXX) pnpm -C packages/nextclaw dev:build agent --session cli:remove-loop-chat`
2. 输入第一句，确认有回复。
3. 输入第二句追问，确认上下文延续。
4. 输入 `exit`，确认正常退出。

观察点：

- 多轮连续成立
- session 仍被复用
- 退出行为正常

### 4. Service / Gateway / Channel Inbound

目标：确认 service 启动后，入站消息仍能被路由和执行。

建议步骤：

1. 启动隔离环境 service：
   - `NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-agentloop-remove-serve.XXXXXX) pnpm -C packages/nextclaw dev serve --ui-port 19421`
2. 等待日志中出现 NCP agent ready。
3. 通过已有最小可行方式触发一条入站消息，或调用对应 API/bridge。

观察点：

- service 正常启动
- deferred NCP agent 正常 ready
- 入站请求有响应
- 没有尝试回退到 `NativeAgentEngine`

### 5. Plugin Runtime Bridge

目标：确认插件桥文本和附件仍能正常执行，但底层已不再走 `processDirect`。

建议方式：

- 运行已有单测
- 若环境允许，再做一次最小桥接冒烟：
  - 文本消息一条
  - 仅附件消息一条

观察点：

- 文本桥接成功
- 附件桥接成功
- bridge 未 ready 时显式失败，而不是偷偷 fallback

### 6. Cron / Heartbeat

目标：确认本次大改没有把已完成的 NCP cutover 拉回旧直驱。

建议步骤：

1. 在隔离 home 启动 service。
2. 新建一个最小 cron job。
3. 手动 `cron run <jobId> --force`。
4. 若 heartbeat 可触发，再触发一次 heartbeat。

观察点：

- session metadata 仍体现 NCP session 语义
- 行为仍是 NCP 执行，不是 legacy direct path

### 7. Session 历史与继续追问

目标：确认执行核心删除后，历史 session 没有断。

建议步骤：

1. 使用旧 session 或先创建一条新 session。
2. 发两轮对话。
3. 重启服务或重新进入 CLI。
4. 对同一 session 再追问一轮。

观察点：

- 历史可读
- 继续追问可用
- metadata 未丢失

## 失败信号清单

出现以下任一项，都说明这次删除还不能算完成：

1. 仓库 live code 仍出现 `AgentLoop` / `NativeAgentEngine`。
2. plugin bridge、CLI、gateway 任一执行路径仍调用 `processDirect(...)` 或 direct native engine。
3. UI 或 CLI 的 stop 行为退化成“前端停了，后端还在跑”。
4. session 历史读不到，或继续追问丢上下文。
5. service 启动时 NCP 未 ready，系统又偷偷回落到旧执行链。
6. 文档仍把 `AgentLoop` 写成当前主执行核心。

## 分阶段实施任务

### 任务 1：补回中文方案、补齐失败测试和影响面验证基线

**文件：**
- Modify: `docs/plans/2026-04-11-agent-loop-removal-implementation-plan.md`
- Modify: `packages/nextclaw/src/cli/commands/service-support/plugin/tests/service-plugin-runtime-bridge.test.ts`
- Modify: `packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.command.test.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/tests/service-gateway-bootstrap.test.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/tests/service-gateway-startup.test.ts`

**动作：**
1. 先把测试目标改成“所有执行入口都必须走 NCP 合同，而不是 `AgentLoop` / `processDirect` 合同”。
2. 让这些测试先失败，用来证明切换点真实存在。

### 任务 2：抽出共享 NCP runner，禁止继续扩散 direct-exec

**文件：**
- Create: `packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-runner.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-runner.test.ts`
- Modify: `packages/nextclaw/src/cli/commands/ncp/runtime/ui-ncp-agent-handle.ts`
- Modify: `packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts`

**动作：**
1. 新建最薄共享 runner。
2. 只负责把输入变成 NCP message、执行 run、提取最终 assistant message。
3. 不在这里塞第三套抽象层。

### 任务 3：切 plugin runtime bridge

**文件：**
- Modify: `packages/nextclaw/src/cli/commands/service-support/plugin/service-plugin-runtime-bridge.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/plugin/tests/service-plugin-runtime-bridge.test.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-bootstrap.ts`

**动作：**
1. 让 plugin bridge 改依赖 live NCP runner 或 live `UiNcpAgentHandle`。
2. 删除对 `runtimePool.processDirect(...)` 的依赖。
3. 未 ready 时显式失败。

### 任务 4：切 CLI agent

**文件：**
- Modify: `packages/nextclaw/src/cli/runtime.ts`
- Create: `packages/nextclaw/src/cli/runtime.agent-mode.test.ts`
- Modify: `packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-runner.ts`

**动作：**
1. 删除 CLI 直接 new `AgentLoop(...)` 的路径。
2. 单轮与交互式都复用 NCP 合同。

### 任务 5：切 gateway/channel inbound

**文件：**
- Modify: `packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.ts`
- Modify: `packages/nextclaw/src/cli/commands/agent/agent-runtime-pool.command.test.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-context.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/gateway/service-gateway-startup.ts`
- Modify: `packages/nextclaw/src/cli/commands/service-support/session/service-deferred-ncp-agent.ts`

**动作：**
1. 把 `GatewayAgentRuntimePool` 从 engine owner 收缩成 routing + NCP dispatch owner。
2. 删除 native engine 创建和缓存逻辑。

### 任务 6：成批删除 `AgentLoop` 与 `NativeAgentEngine`

**文件：**
- Delete: `packages/nextclaw-core/src/agent/loop.ts`
- Delete: `packages/nextclaw-core/src/engine/native.ts`
- Modify: `packages/nextclaw-core/src/index.ts`
- Modify: `packages/nextclaw-core/src/engine/types.ts`
- Delete or rewrite loop-centric tests
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/USAGE.md`

**动作：**
1. 删文件本体。
2. 删导出。
3. 删旧测试。
4. 改当前文档口径。

### 任务 7：集中清理、验证、留痕

**文件：**
- Modify: `docs/logs/<iteration>/README.md`

**动作：**
1. 跑自动化验证。
2. 跑手工验收。
3. 跑残留搜索。
4. 记录删减规模和最终结论。

## 最终验收标准

同时满足以下条件，才允许宣布 `AgentLoop` 已完成移除：

1. UI chat、CLI agent、gateway/channel inbound、plugin runtime bridge、cron/heartbeat 都只走 NCP。
2. 仓库 live code 中不存在 `AgentLoop` 和 `NativeAgentEngine` 定义与引用。
3. 不存在任何 “NCP 不可用时回退到 `AgentLoop`” 的 fallback。
4. session 历史、继续追问、metadata 持久化仍正常。
5. 当前有效文档已经不再把 `AgentLoop` 描述为执行主链。

Plan complete and saved to `docs/plans/2026-04-11-agent-loop-removal-implementation-plan.md`。
