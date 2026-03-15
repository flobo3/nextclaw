# NCP（NextClaw Communication Protocol）通用 Endpoint 实施方案

## 0. 背景与目标

本方案将 `/Users/peiwang/.claude/plans/wondrous-knitting-cake.md` 的实现计划正式纳入项目 design，并在此基础上补充“通用 Endpoint 抽象基类”设计，确保我们不是为 `codex/claude` 做一次性接入，而是建设可长期扩展的通信协议底座。

目标：
- 支持任意通信端点：Agent（Codex/Claude）、办公平台（飞书/钉钉）、邮箱、真人等。
- 同时对 Agent 通信友好（流式、多 Part、工具/推理事件）与对协作平台友好（异步、卡片/附件、主动消息）。
- 在不破坏现有 `AgentEngine` 外部行为的前提下，逐步演进到统一 Endpoint 协议。

非目标（本阶段）：
- 不一次性重写 UI 与运行时主链路。
- 不在首轮引入全部 bridge（memory/tool/routing 全量共享）。

---

## 1. 协议分层（NCP）

- `NCP-Core`（所有端点必须实现）
  - Manifest（能力声明）
  - Message（统一消息结构，Parts-based）
  - Event（统一事件流）
  - Session（会话映射与持久化契约）
  - Error（统一错误分类）
- `NCP-Agent`（Agent 专用扩展）
  - Tool/Reasoning/Skill/Context 等能力桥接
- `NCP-Platform`（协作平台扩展）
  - Card/RichText/Action/Attachment 等平台能力

结论：`NCIP v1` 可视作 `NCP-Agent` 的首个 profile，而非全协议本体。

---

## 2. 包与目录规划

新增 `packages/nextclaw-ncp/`（发布名：`@nextclaw/ncp`）：

```text
packages/nextclaw-ncp/
  package.json
  tsconfig.json
  src/
    index.ts
    types/
      index.ts
      manifest.ts
      message.ts
      errors.ts
      session.ts
      stream.ts
      endpoint.ts
    utils/
      index.ts
      config-readers.ts
      prompt-builder.ts
    endpoint/
      abstract-endpoint.ts
      abstract-agent-endpoint.ts
```

---

## 3. Endpoint 抽象基类（核心补充）

### 3.1 统一接口（协议层）

```ts
export type EndpointKind = "agent" | "platform" | "email" | "human" | "custom";

export type EndpointManifest = {
  endpointKind: EndpointKind;
  endpointId: string;
  version: string;
  supportsStreaming: boolean;
  supportsAbort: boolean;
  supportsProactiveMessages: boolean;
  supportsRunStream: boolean;
  supportedPartTypes: string[];
  expectedLatency: "realtime" | "seconds" | "minutes" | "hours" | "days";
  sharedLevel?: "minimal" | "partial" | "full";
};

export type EndpointEvent =
  | { type: "endpoint.ready" }
  | { type: "message.received"; payload: InboundEnvelope }
  | { type: "message.delta"; payload: MessageDeltaEnvelope }
  | { type: "message.completed"; payload: CompletedEnvelope }
  | { type: "message.failed"; payload: FailedEnvelope }
  | { type: "endpoint.error"; payload: NcpError };

export interface Endpoint {
  readonly manifest: EndpointManifest;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(message: OutboundEnvelope): Promise<SendReceipt>;
  subscribe(listener: (event: EndpointEvent) => void): () => void;
}
```

### 3.2 抽象基类（默认能力）

```ts
export abstract class AbstractEndpoint implements Endpoint {
  abstract readonly manifest: EndpointManifest;
  private listeners = new Set<(event: EndpointEvent) => void>();

  async start(): Promise<void> {
    await this.onStart();
    this.emit({ type: "endpoint.ready" });
  }

  async stop(): Promise<void> {
    await this.onStop();
  }

  async send(message: OutboundEnvelope): Promise<SendReceipt> {
    return this.onSend(message);
  }

  subscribe(listener: (event: EndpointEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected emit(event: EndpointEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onSend(message: OutboundEnvelope): Promise<SendReceipt>;
}
```

### 3.3 Agent 专用抽象基类（兼容当前实现）

```ts
export abstract class AbstractAgentEndpoint extends AbstractEndpoint {
  protected abstract executeTurn(input: AgentTurnInput): AsyncIterable<EndpointEvent>;
  protected abstract resolveModel(input: AgentTurnInput): string;
  protected abstract resolveSession(sessionKey: string): Promise<SessionBinding>;
}
```

定位：
- `codex-sdk` / `claude-agent-sdk` 实现为 `AbstractAgentEndpoint` 子类。
- 飞书/钉钉/邮箱/真人类端点直接实现 `AbstractEndpoint` 或后续 `AbstractPlatformEndpoint`。

---

## 4. 类型与错误统一

### 4.1 Message Parts

- Core Parts：`text`、`file`、`source`、`step-start`
- Agent Parts：`reasoning`、`tool-invocation`
- Platform Parts：`card`、`rich-text`、`action`
- 扩展 Part：`extension`（`extensionType + data`）

### 4.2 错误分类

统一到：
- `config_error`
- `auth_error`
- `runtime_error`
- `timeout_error`
- `abort_error`

要求：
- Endpoint 内部错误必须在出口处归一化为 `NcpError`，禁止把底层 SDK 原始错误直接上抛到 UI。

---

## 5. 从现有计划升级后的实施阶段

## Phase 1：创建 `@nextclaw/ncp` 包骨架
- 按既有计划创建类型、工具、导出入口。
- 补充 `endpoint.ts` 与 `abstract-endpoint.ts`（本方案新增关键项）。

## Phase 2：抽取通用工具与 Agent 基类
- 将 codex/claude 重复读取工具迁移到 `utils/config-readers.ts`。
- 落地 `AbstractAgentEndpoint`，承载 `handleInbound/processDirect` 通用骨架。

## Phase 3：重构 Codex/Claude 插件为薄子类
- `codex` 子类保留 thread 与事件映射特性。
- `claude` 子类保留 query/options/session resume 特性。
- 插件注册对外形式不变（`registerEngine(..., { kind })`）。

## Phase 4：构建系统与回归验证
- 根 `package.json` 的 `build/lint/tsc` 链路插入 `@nextclaw/ncp`。
- 确认 `AgentEngine`、runtime pool、UI 协议不破坏。

## Phase 5（可选）：Platform Endpoint PoC
- 先做一个非 Agent 端点 PoC（建议飞书 webhook ingress + send message egress），验证双向异步模型。

---

## 6. 兼容性约束

首轮必须保证不变：
- `packages/nextclaw-core/src/engine/types.ts` 对外 `AgentEngine` 语义
- `packages/nextclaw/src/cli/commands/agent-runtime-pool.ts` 消费方式
- `packages/nextclaw/src/cli/commands/ui-chat-run-coordinator.ts` 现有 stream 语义
- `packages/nextclaw-ui/*` 与 `packages/nextclaw-agent-chat/*` 对外 API

---

## 7. 验证与验收

基础验收：
- `pnpm build`
- `pnpm tsc`
- `pnpm lint`

协议验收（新增）：
- Manifest 完整性检查（字段齐全、值合法）
- 事件契约检查（`received/delta/completed/failed`）
- 错误归一化检查（5 类错误码）
- Agent 回归：codex/claude 行为与重构前一致

---

## 8. 执行顺序（建议）

1. `@nextclaw/ncp` 骨架 + 类型 + 基类
2. 构建链路接入
3. codex 重构
4. claude 重构
5. 协议级验收测试
6.（可选）飞书端点 PoC

> 本文档是项目 design 基线；后续实现迭代应在 `docs/logs` 按版本递增记录落地与验证结果。
