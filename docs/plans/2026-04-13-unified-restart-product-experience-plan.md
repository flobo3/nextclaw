# Unified Restart Product Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 NextClaw 提供一套跨 Desktop 与 Web 一致、可理解、可恢复、可扩展的产品化重启能力，让用户可以在前端主动触发合适层级的重启，而不是被动依赖 CLI 或模糊报错。

**Architecture:** 采用“统一产品合同，不同执行 owner”的方案。前端始终消费同一套 `runtime control` 语义与状态模型；Desktop 由 Electron 主进程作为稳定 supervisor 执行 `restart service` / `restart app`，Web 则由 server runtime 暴露可用能力并通过 restart coordinator 或宿主控制面执行 `restart service`。所有环境都通过 capability discovery 决定“显示什么按钮、按钮是否可用、影响范围是什么”，而不是让前端硬编码环境分支。

**Tech Stack:** Electron、TypeScript、React、Zustand、Hono、WebSocket realtime、NextClaw CLI runtime、RestartCoordinator、RuntimeServiceProcess。

---

## 长期目标对齐 / 可维护性推进

- 这项方案直接服务 `docs/VISION.md` 里“统一入口、统一体验、足够可靠”的要求。一个想成为 AI 时代默认入口的产品，不能让“重启”只是一条 CLI 命令，也不能让不同端各自长出不同语义。
- 这次的重点不是“增加一个按钮”，而是把“用户主动想重启”提升成明确的产品能力与运行时能力。
- 长期维护性方向：
  - UI 不直接感知底层环境细节，而是消费统一 capability contract。
  - Desktop / Web 复用同一套状态、文案、确认、恢复逻辑，只在执行 owner 不同。
  - 把当前分散的 restart 入口逐步收敛到 `RuntimeControlManager`、`RuntimeControlHost`、`RestartCoordinator` 三层边界，减少散落的直接 restart 分支。

## 问题重新定义

本方案讨论的不是：

- 哪些配置应该自动热生效
- 什么时候系统应自动推荐重启
- 如何消灭所有不可用情况

本方案只讨论一件事：

- 当用户明确想要重启时，NextClaw 是否在前端提供这项能力
- 如果提供，Desktop 与 Web 是否能呈现一致且产品化的体验
- 这项能力应由哪一层执行，怎样才符合最佳实践

## 结论先行

### 我的结论

- 应该提供前端重启能力，而且应同时覆盖 Desktop 与 Web。
- 不能只提供一个无差别的 `Restart` 按钮，必须拆成明确的重启目标。
- 不需要先做全局大重构，但必须先定义统一的产品合同与 capability model，否则 Desktop 和 Web 会继续各做一套。

### 单期交付判断

- 这件事做成“可上线的 v1”在单期内是现实的，但前提是范围明确收紧。
- 单期内的合理目标是：
  - 提供统一的 `Runtime Control` 产品入口
  - Web 支持 `Restart Service`
  - Desktop 支持 `Restart Service` 与 `Restart App`
  - 两端都具备明确的 `重启中 / 恢复中 / 失败` 体验
- 单期内暂不追求：
  - 所有部署环境的权限治理细化
  - 所有 restart / recovery 事件都变成持久化审计
  - 全局任意页面都出现复杂状态条或多层浮层系统
- 结论：本方案按单期可交付版本推进，不继续无限拆期。

### 推荐的两级重启模型

1. `Restart Service`
- 重启当前 NextClaw runtime / 后台服务。
- 这是默认主按钮，覆盖大多数“恢复运行时”“清理异常状态”“应用本轮需重启变更”的场景。

2. `Restart App`
- 重启整个桌面应用。
- 只在 Desktop 可见，且只在更新、壳级异常、宿主级切换或用户主动选择时提供。

### 为什么不推荐单按钮

- 用户多数时候想恢复的是本地运行时，而不是关闭整个应用壳。
- Web 场景并不总有“应用”这一层可重启，只有“服务”或“无权重启”。
- 单按钮会掩盖影响范围，体验不诚实，也不利于后续扩展。

## 一致的产品合同

无论 Desktop 还是 Web，前端都应消费同一套用户语义：

### 1. 能力发现合同

前端先读取当前环境的 `runtime control capability`，决定：

- 当前环境是否支持 `restart service`
- 当前环境是否支持 `restart app`
- 当前动作由谁执行
- 该动作是否会中断当前页面
- 用户是否有权限
- 如果不可用，为什么不可用

### 2. 统一状态合同

所有端统一暴露这些产品状态：

- `healthy`
- `restarting-service`
- `restarting-app`
- `recovering`
- `unavailable`
- `failed`

这些状态是产品态，不是底层 transport 细节。

### 3. 统一确认合同

用户点击重启前，如果命中以下任一条件，必须先确认：

- 当前存在流式回复或长任务
- 当前有未发送草稿
- 当前动作会导致页面短暂断开
- 当前动作是 `restart app`

确认文案必须显式说明：

- 重启对象
- 预计影响
- 当前任务是否会中断

### 4. 统一恢复合同

重启被接受后，前端不能只等报错，而要进入明确的“重启进行中”体验：

- 全局显示 `Restarting NextClaw service...`
- 暂存当前草稿
- 屏蔽新的发送动作
- 自动等待恢复并重连
- 成功后显示恢复成功 toast
- 失败后给出 `Retry` / `View diagnostics`

## 运行环境矩阵

### 环境 A：Desktop Embedded Runtime

定义：

- UI 运行在 Electron 渲染层
- NextClaw runtime 由 Electron 主进程拉起和监督

能力：

- `restart service`：支持
- `restart app`：支持

最佳执行 owner：

- Electron 主进程

原因：

- 被重启的 runtime 不是合适的 owner
- 主进程是更稳定的 supervisor
- 可以在服务断开期间维持原生级 loading / overlay

### 环境 B：Local Managed Service + Browser UI

定义：

- UI 由浏览器访问本地或自管的 NextClaw 服务
- 当前 UI 页本身由被重启的服务提供

能力：

- `restart service`：可支持
- `restart app`：不支持

最佳执行 owner：

- server runtime 的 restart control host

体验特点：

- 用户点击后，页面会短暂断开
- 页面恢复依赖浏览器自动重连和前端恢复态 UI

### 环境 C：Self-Hosted Admin Web

定义：

- 用户通过 Web 管理自己部署的 NextClaw 实例

能力：

- `restart service`：按部署能力决定，通常仅 admin 可见
- `restart app`：不支持

最佳执行 owner：

- 部署宿主 / runtime control host / platform operator hook

### 环境 D：Shared / Remote Web

定义：

- UI 对接共享实例、托管实例、或用户无主机控制权的服务

能力：

- `restart service`：默认不支持，除非明确暴露受控 API
- `restart app`：不支持

体验要求：

- 按钮不显示或 disabled，并给出原因：
  `This environment does not allow restart from the UI.`

## 产品体验设计

### 全局入口

必须有两个统一入口，而不是把能力藏在单个页面里：

1. 全局状态入口
- Header / Sidebar 的 runtime status pill
- 点开后进入 `Runtime Control Panel`

2. Runtime 设置页
- 提供更完整说明、诊断入口、最近一次重启结果

### Runtime Control Panel 内容

- 当前状态：Healthy / Recovering / Restarting / Failed
- 当前环境：Desktop / Local Service / Hosted Web / Shared Runtime
- 主按钮：`Restart Service`
- 次按钮：`Restart App`（仅 Desktop）
- 辅助动作：`Open Diagnostics`
- 风险提示：当前是否有运行中任务、是否会短暂断开

### 点击后的交互

#### Restart Service

- 二次确认只在必要时出现
- 执行后立刻切换到 `restarting-service`
- Desktop 显示壳级 overlay
- Web 显示全局 reconnect banner + overlay
- 恢复成功后自动回到 `healthy`

#### Restart App

- 永远先确认
- 文案明确说明“整个桌面应用将重新启动”
- Electron 主进程负责 relaunch
- 下次启动后可通过启动态 toast 标记这是一次用户主动重启

### 错误体验

- 不允许把“重启中导致的连接断开”当成普通 `network error`
- 用户主动触发后的一段恢复窗口内，请求层必须把连接错误翻译为 `recovering`
- 如果超过恢复时间窗，才进入 `failed`

## 统一能力与状态模型

建议新增共享 view contract：

```ts
type RuntimeControlEnvironment =
  | "desktop-embedded"
  | "managed-local-service"
  | "self-hosted-web"
  | "shared-web";

type RuntimeLifecycleState =
  | "healthy"
  | "restarting-service"
  | "restarting-app"
  | "recovering"
  | "unavailable"
  | "failed";

type RuntimeActionCapability = {
  available: boolean;
  requiresConfirmation: boolean;
  impact: "none" | "brief-ui-disconnect" | "full-app-relaunch";
  reasonIfUnavailable?: string;
};

type RuntimeControlView = {
  environment: RuntimeControlEnvironment;
  lifecycle: RuntimeLifecycleState;
  activeOperationId?: string | null;
  activeReason?: string | null;
  canRestartService: RuntimeActionCapability;
  canRestartApp: RuntimeActionCapability;
  hasRunningTask: boolean;
  lastOperation?: {
    kind: "restart-service" | "restart-app";
    status: "accepted" | "completed" | "failed";
    startedAt: string;
    completedAt?: string;
    message?: string;
  } | null;
};
```

## 执行 owner 设计

### UI owner：`RuntimeControlManager`

职责：

- 读取 capability
- 决定按钮是否显示/可用
- 统一确认文案
- 统一处理 `accepted -> restarting -> recovered -> failed`
- 合并 Desktop IPC 状态与 WebSocket / HTTP 状态

不负责：

- 直接重启服务或应用

### Server owner：`RuntimeControlHost`

职责：

- 返回 `RuntimeControlView`
- 执行可由 server 控制的 `restart service`
- 发布 runtime lifecycle realtime 事件
- 对不支持的环境给出明确 unavailable reason

### Desktop owner：`DesktopRuntimeControlBridge`

职责：

- 暴露 `restartService()` 与 `restartApp()`
- 让 Electron 主进程接管桌面内嵌 runtime 的重启
- 在服务不可达期间继续维持 UI 恢复态

### Runtime owner：`RestartCoordinator`

职责：

- 执行真正的 runtime / background service restart
- 防止重复重启请求
- 统一 restart 结果语义

## Desktop 与 Web 的差异化实现

### Desktop 实现

前端动作路径：

- React UI
- `RuntimeControlManager`
- `window.nextclawDesktop.restartService()` 或 `restartApp()`
- Electron main process
- `RuntimeServiceProcess.stop() -> start()` 或 `app.relaunch()`

关键约束：

- Desktop 的 `restart service` 不应走普通 HTTP API 自杀式执行
- 主进程必须成为 restart service 的唯一 owner
- preload 需要新增 runtime control IPC bridge

### Web 实现

前端动作路径：

- React UI
- `RuntimeControlManager`
- `POST /api/runtime/control/restart-service`
- `RuntimeControlHost`
- `RestartCoordinator` / host-specific restart implementation

关键约束：

- API 必须先返回 `accepted`，再进入短暂断联窗口
- 不能在 response 尚未完成前直接 exit 当前进程
- 对当前页面由被重启服务提供的场景，要用 reconnect UX 包住断联

## API 与事件合同

### HTTP

建议新增：

- `GET /api/runtime/control`
  - 返回 `RuntimeControlView`
- `POST /api/runtime/control/restart-service`
  - body: `{ reason?: string }`
  - 返回：`{ accepted: true, operationId, impact, message }`

不建议在 Web server 暴露 `restart-app`：

- 该动作仅适用于 Desktop
- Desktop 通过 IPC bridge 暴露即可

### Realtime 事件

建议新增：

- `runtime.lifecycle.changed`
- `runtime.restart.accepted`
- `runtime.restart.completed`
- `runtime.restart.failed`

这样前端就不必靠 transport error 猜当前是不是在重启。

## 文案与交互规范

### 默认按钮文案

- `Restart Service`
- `Restart App`

### 说明文案

- `Restart Service`:
  `Restart the local NextClaw runtime. The page may disconnect briefly while the service comes back.`

- `Restart App`:
  `Restart the entire NextClaw desktop app. This closes the current app window and relaunches it immediately.`

### 进行中文案

- `正在重启 NextClaw 运行时...`
- `正在重新启动 NextClaw 应用...`
- `正在等待服务恢复连接...`

### 失败文案

- `重启未成功完成。你可以重试，或打开诊断信息查看原因。`

## 非目标

- 本方案不负责决定“哪些配置必须重启”
- 本方案不负责一次性解决所有 runtime 不可用问题
- 本方案不承诺首版就支持所有自部署环境的远程重启

## 单期执行顺序

### Step 1：统一 capability + UI contract

目标：

- 先让 UI 有一致的“看到重启、理解重启、展示重启中”的能力

交付：

- `RuntimeControlView`
- `RuntimeControlManager`
- Runtime 页面内的 Runtime Control Panel
- Web 与 Desktop 共用文案与状态 UI

### Step 2：Desktop 完整闭环

目标：

- 让 Desktop 支持用户主动 `Restart Service` 与 `Restart App`

交付：

- preload 新增 restart IPC
- main process 接管 runtime service restart / app relaunch
- Desktop UI 明确进入重启中与恢复态

### Step 3：Web service restart 产品化

目标：

- 管理型 Web 环境支持前端主动重启服务

交付：

- `/api/runtime/control`
- `/api/runtime/control/restart-service`
- 请求 accepted 后进入恢复等待 UX

### Step 4：环境差异收敛

目标：

- 让不支持完整重启能力的环境不会误导用户

交付：

- capability discovery 按环境返回可用性
- 无权限场景的 disabled reason

## 验收标准

### 用户视角

1. 在 Desktop 中，用户能看到 `Restart Service` 与 `Restart App` 两种动作，且知道影响范围。
2. 在 Desktop 中点击 `Restart Service` 后，不会只看到普通 network error，而会看到明确的恢复态。
3. 在 Web 管理型环境中，用户可以从前端触发 `Restart Service`，并看到一致的重启中与恢复后反馈。
4. 在不支持重启的 Web 环境中，UI 不会误导性展示可点击按钮，而会给出明确说明。
5. 当前有运行中任务时，重启前会出现风险提示。

### 技术视角

1. Desktop service restart 由 Electron 主进程执行，不由被重启服务自杀式执行。
2. Web restart API 会先返回 accepted，再进入断联窗口。
3. UI transport 层能把“用户主动重启期间的断联”识别为 `recovering` 而非普通失败。
4. 重启状态可以通过 query + realtime 恢复，不依赖页面硬刷新。

## 实施任务

### Task 1: 定义统一 runtime control contract

**Files:**
- Modify: `packages/nextclaw-server/src/ui/types.ts`
- Modify: `packages/nextclaw-ui/src/api/types.ts`
- Modify: `packages/nextclaw-ui/src/transport/transport.types.ts`
- Test: `packages/nextclaw-server/src/ui/router.runtime-control.test.ts`

**Step 1**
- 新增 `RuntimeControlView`、`RuntimeLifecycleState`、runtime restart 事件类型。

**Step 2**
- 为 UI api types 对齐新增类型。

**Step 3**
- 为新事件写 server/router 契约测试。

### Task 2: 新增 Web runtime control host 与路由

**Files:**
- Create: `packages/nextclaw-server/src/ui/ui-routes/runtime-control.controller.ts`
- Modify: `packages/nextclaw-server/src/ui/ui-routes/types.ts`
- Modify: `packages/nextclaw-server/src/ui/router.ts`
- Modify: `packages/nextclaw/src/cli/runtime.ts`
- Modify: `packages/nextclaw/src/cli/restart-coordinator.ts`
- Test: `packages/nextclaw-server/src/ui/router.runtime-control.test.ts`

**Step 1**
- 定义 `UiRuntimeControlHost`。

**Step 2**
- 暴露 `GET /api/runtime/control` 与 `POST /api/runtime/control/restart-service`。

**Step 3**
- 接上 `RestartCoordinator`，并确保返回 accepted 后再进入 restart path。

### Task 3: Desktop 暴露 runtime control IPC bridge

**Files:**
- Modify: `apps/desktop/src/preload.ts`
- Modify: `apps/desktop/src/main.ts`
- Modify: `apps/desktop/src/runtime-service.ts`
- Create: `packages/nextclaw-ui/src/desktop/desktop-runtime-control.types.ts`
- Test: `apps/desktop/src/runtime-service.test.ts`

**Step 1**
- preload 新增 `restartService`、`restartApp`、`getRuntimeControlState`、`onRuntimeControlStateChanged`。

**Step 2**
- main process 新增 IPC handler，并由 `RuntimeServiceProcess` 执行 service restart。

**Step 3**
- 保证 Desktop runtime restart 有明确中间状态，而不是只依赖端口恢复。

### Task 4: UI 统一 Runtime Control Manager 与全局入口

**Files:**
- Create: `packages/nextclaw-ui/src/runtime-control/managers/runtime-control.manager.ts`
- Create: `packages/nextclaw-ui/src/runtime-control/stores/runtime-control.store.ts`
- Create: `packages/nextclaw-ui/src/runtime-control/runtime-control.query.ts`
- Create: `packages/nextclaw-ui/src/components/runtime-control/RuntimeControlPanel.tsx`
- Modify: `packages/nextclaw-ui/src/stores/ui.store.ts`
- Modify: `packages/nextclaw-ui/src/hooks/use-realtime-query-bridge.ts`
- Modify: `packages/nextclaw-ui/src/transport/local.transport.ts`
- Test: `packages/nextclaw-ui/src/components/runtime-control/RuntimeControlPanel.test.tsx`

**Step 1**
- 增加 runtime lifecycle store，收 runtime control query + events。

**Step 2**
- 增加 Runtime Control Panel 与全局入口。

**Step 3**
- 把用户主动重启窗口内的 transport disconnect 翻译成 `recovering`。

### Task 5: 文案、恢复体验与任务中断保护

**Files:**
- Modify: `packages/nextclaw-ui/src/lib/i18n.ts`
- Modify: `packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx`
- Modify: `packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx`
- Test: `packages/nextclaw-ui/src/components/chat/chat-runtime-restart.test.tsx`

**Step 1**
- 新增运行中重启确认文案与恢复提示文案。

**Step 2**
- 当前存在流式任务时，点击重启先弹确认。

**Step 3**
- 恢复成功后给出可感知反馈，而不是静默恢复。

## 打磨建议

- 第一版不要做“重启原因选择器”之类花活，保持单一路径。
- 第一版不要让 Web 直接支持 `restart app`。
- 第一版不要让所有部署环境都承诺支持 UI 重启，capability unavailable 比伪成功更好。

## 最终判断

- 这件事值得做，而且现在就应该进入产品方案与实施排期。
- 最重要的不是把按钮放在哪里，而是先把“同一产品合同，不同执行 owner”定下来。
- 这样做之后，Desktop 与 Web 都能拥有一致、诚实、可恢复的重启体验，同时不把底层环境差异直接甩给用户。
