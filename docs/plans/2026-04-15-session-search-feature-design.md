# Session Search Feature Design v1

日期：2026-04-15

相关文档：

- [NextClaw 产品愿景](../VISION.md)
- [NextClaw Hermes-Inspired Learning Loop Implementation Plan](./2026-04-14-nextclaw-hermes-learning-loop-plan.md)
- [Chat Global Content Search Deferred Design](./2026-04-13-chat-global-content-search-design.md)
- [Cross-Session Request And Child Session Design](./2026-04-03-cross-session-request-and-child-session-design.md)
- [nextclaw-agent-session-store.ts](../../packages/nextclaw/src/cli/commands/ncp/nextclaw-agent-session-store.ts)
- [create-ui-ncp-agent.ts](../../packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts)
- [nextclaw-ncp-tool-registry.ts](../../packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-tool-registry.ts)

## 1. 这份设计要解决什么

这份设计只回答一件事：

**我们要怎样实现 `session_search`，才能既满足 Hermes-inspired learning loop 的下一阶段需求，又尽量不把 NextClaw 代码库做脏。**

这里的重点不是“搜索能不能做出来”，而是：

1. 它是不是一个独立 feature，而不是渗到一堆现有文件里。
2. 它的接入是不是足够轻，未来要删掉时是不是也足够轻。
3. 它是不是服务于 P1 `session_search` 本身，而不是提前把 P2 后台复盘、UI 大搜索、语义搜索一锅炖进去。

本设计默认遵循一个更高优先级目标：

**宁可第一版更小、更克制，也不要为了“以后可能扩展”先把 feature 做成未来的屎山。**

## 2. 结论先写在前面

最终推荐方案如下：

1. `session_search` 作为 **NextClaw 产品层 feature module** 实现。
2. 主实现全部放在 `packages/nextclaw/src/cli/commands/ncp/session-search/`。
3. **不把主实现放进** `packages/ncp-packages/nextclaw-ncp-toolkit/`。
4. 首版只做：
   - 本地关键词 / FTS 搜索
   - 独立 `session_search` tool
   - 结构化命中结果
   - 默认排除当前 session
5. 首版不做：
   - UI 全局搜索面板重构
   - 自动 summarize 搜索结果
   - embedding / hybrid search
   - tool result 全量索引
   - P2 后台复盘调度

一句话概括：

**`session_search` 应该被实现成一个可以整体拔掉的 feature module，而不是几段搜索逻辑散落在 toolkit、session persistence、tool registry 和现有 sessions 工具里。**

## 3. 为什么不应该把主实现放进 ncp-toolkit

这次最关键的设计判断之一，就是：

**`nextclaw-ncp-toolkit` 不应该承载 `session_search` 的主实现。**

原因有四个：

1. `toolkit` 的定位是通用运行时基础设施，而 `session_search` 已经带有明确的产品决策：
   - 索引哪些字段
   - 排除哪些字段
   - 返回什么结果结构
   - 是否默认排除当前 session
   - 将来是否更偏 agent recall 还是 UI 搜索

2. 这些都不是“基础设施最小公约数”，而是 **NextClaw 产品层选择**。

3. 如果主实现进了 toolkit，未来要删除或重做 `session_search` 时，就会把产品能力和基础设施耦死。

4. 这会违反本轮最重要的可维护性原则：
   - feature 应尽量局部存在
   - 删除时应尽量局部删除

因此，本设计只接受两种对 toolkit 的使用方式：

1. **只读复用** 它已有的 session API / session store 抽象
2. 如确有必要，只增加极小扩展缝

但 **不接受**：

1. 在 toolkit 里放 search 索引表结构
2. 在 toolkit 里放 query service
3. 在 toolkit 里放 snippet 逻辑
4. 在 toolkit 里放 `session_search` tool 本体

## 4. 产品边界与非目标

### 4.1 产品目标

P1 `session_search` 的目标只有这些：

1. Agent 能按关键词跨 session 找历史内容。
2. 搜索结果能解释“为什么命中”，而不是只返回 session id。
3. 后续 P2 后台复盘可以直接复用这套检索底座。
4. 这套能力是独立查询面，不污染 memory，也不挤进 `sessions_history`。

### 4.2 非目标

首版明确不做：

1. 语义搜索
2. embedding / rerank
3. tool result 搜索
4. 自动总结命中结果
5. UI 搜索结果面板大改
6. 命中消息跳转高亮
7. 图片 / OCR 搜索

## 5. 设计原则

本设计强制遵循以下原则：

### 5.1 Feature-local first

`session_search` 的大部分代码必须集中在一个独立目录里，而不是散落进：

- `packages/nextclaw-core/src/agent/tools/sessions.ts`
- `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend-session-persistence.ts`
- `packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-tool-registry.ts`

### 5.2 Independent query surface

`session_search` 必须是新工具，不复用：

- `sessions_list`
- `sessions_history`
- `memory_search`

### 5.3 Separate derived index

搜索索引必须被当成 **派生索引** 看待，而不是主 session record 的一部分。

这意味着：

1. 主 session 数据仍由现有 session store 管理
2. `session_search` 维护自己的索引文件 / 索引表
3. 即使未来删掉 `session_search`，主 session 数据也不受影响

### 5.4 Minimal seams

第一版只允许很少的接入缝：

1. 启动时初始化 feature
2. session 更新后通知 feature 增量 reindex
3. tool registry 注册一个新工具

除此之外，避免把 feature 逻辑渗透到更多地方。

### 5.5 Deleteability as a first-class concern

如果未来决定删除 `session_search`，理想情况应该是：

1. 删除 `packages/nextclaw/src/cli/commands/ncp/session-search/`
2. 删掉一个初始化点
3. 删掉一个注册点
4. 删掉一个 session update hook

而不是去 toolkit / backend / core 各层做大范围回退。

## 6. 推荐目录结构

推荐目录如下：

```text
packages/nextclaw/src/cli/commands/ncp/session-search/
├── session-search.types.ts
├── session-search-store.service.ts
├── session-search-index.manager.ts
├── session-search-query.service.ts
├── session-search.tool.ts
└── session-search-feature.service.ts
```

各文件职责：

1. `session-search.types.ts`
   - 类型定义
   - `SessionSearchDocument`
   - `SessionSearchHit`
   - 查询参数

2. `session-search-store.service.ts`
   - 只负责本地索引存储读写
   - 管理 SQLite / FTS 表
   - 不做业务判断

3. `session-search-index.manager.ts`
   - 把 session record 转成可索引 document
   - 决定索引哪些字段
   - upsert / delete document

4. `session-search-query.service.ts`
   - 执行搜索
   - 过滤当前 session
   - 生成 snippet
   - 排序和 limit

5. `session-search.tool.ts`
   - tool schema
   - 参数校验
   - 调用 query service

6. `session-search-feature.service.ts`
   - feature owner
   - 负责初始化、启动时补索引、处理 session updated hook、暴露 tool

这里故意没有再拆：

1. `snippet builder`
2. `repository`
3. `adapter`
4. `bootstrap manager`

原因很简单：第一版还不值得为了“看起来更架构”而增加抽象层数。

## 7. 推荐的 owner 抽象

### 7.1 SessionSearchFeatureService

这是整个 feature 的唯一顶层 owner。

建议职责：

1. 在 NextClaw 启动时初始化索引存储
2. 在启动后做一次轻量 reconcile
3. 响应 `onSessionUpdated(sessionId)` 事件
4. 暴露 `createTool()` 或 `getTool()` 给 tool registry
5. 管理 feature 生命周期和资源释放

建议接口形态：

```ts
class SessionSearchFeatureService {
  initialize = async (): Promise<void> => {};
  handleSessionUpdated = async (sessionId: string): Promise<void> => {};
  handleSessionDeleted = async (sessionId: string): Promise<void> => {};
  createTool = (params: { currentSessionId: string }): NcpTool => {};
  dispose = async (): Promise<void> => {};
}
```

这样设计的好处是：

1. 外部系统只知道这是个 feature owner
2. 不需要知道里面有没有 store / index / query 三层
3. 删除时最轻

### 7.2 SessionSearchIndexManager

这是 feature 内部的索引 owner。

职责严格限制为：

1. 从 session store 读取一个 session
2. 提取可索引文本
3. 生成 document
4. 写入 store

它不负责：

1. 搜索
2. tool schema
3. session update 订阅

### 7.3 SessionSearchQueryService

这是 feature 内部的查询 owner。

职责严格限制为：

1. 根据 query 查索引
2. 默认排除当前 session
3. 返回结构化 hits
4. 生成 snippet

它不负责：

1. 重建索引
2. session 生命周期
3. tool 注册

## 8. 数据来源与存储设计

### 8.1 数据来源

`session_search` 不直接接触 toolkit 内部实现细节，而是使用已经存在的会话读模型：

- [NextclawAgentSessionStore](../../packages/nextclaw/src/cli/commands/ncp/nextclaw-agent-session-store.ts)

这是一个非常关键的设计点。

理由：

1. 它已经是 NextClaw 产品层的 session 读取抽象
2. 它隔离了底层 session manager / backend 差异
3. `session_search` 只需要“读 session record”，不应该知道更多底层细节

### 8.2 索引存储

建议用独立 SQLite 文件，例如：

```text
<nextclaw-data-dir>/session-search.db
```

不要把搜索索引塞进现有 session record。

建议至少两张表：

1. `session_search_documents`
   - document 行
2. `session_search_meta`
   - 记录某个 session 最新索引时间 / version / updatedAt

如果使用 SQLite FTS5，则可额外用：

3. `session_search_documents_fts`

这样做的好处：

1. 搜索是 feature-local 派生索引
2. 删除 feature 时只需要删一个独立 db 文件
3. 主 session store 不被污染

## 9. 索引范围

第一版建议索引：

1. `session label`
2. `user-text`
3. `assistant-text`
4. `drawing-prompt`

第一版建议排除：

1. `tool` message
2. 大段 JSON
3. system / service 内部 message
4. 文件附件内容
5. 图片本体

这里要特别克制：

**第一版的目标不是“索引一切”，而是“索引最值得被找回的文本”。**

## 10. 查询结果结构

推荐返回：

```ts
type SessionSearchHit = {
  sessionId: string;
  messageId?: string;
  sessionLabel?: string;
  matchedField: "session-label" | "user-text" | "assistant-text" | "drawing-prompt";
  snippet: string;
  timestamp: string;
  score: number;
};
```

工具参数建议：

```ts
type SessionSearchParams = {
  query: string;
  limit?: number;
  excludeCurrentSession?: boolean;
  sessionType?: string;
};
```

默认行为：

1. `limit = 10`
2. `excludeCurrentSession = true`

## 11. 最小接入方案

这部分是整个设计最重要的“防屎山”部分。

### 11.1 启动接入

在 [create-ui-ncp-agent.ts](../../packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts) 初始化 `SessionSearchFeatureService`。

这里只做两件事：

1. 创建 feature owner
2. 在 agent 启动时 `initialize()`

### 11.2 session 更新接入

利用现有 `onSessionUpdated(sessionId)` 接缝，而不是去修改 toolkit backend 的 session persistence 主流程。

这个接缝已经存在于：

- `NextclawAgentSessionStore`
- `UiSessionService`
- `SessionCreationService`
- `SessionRequestBroker`

所以建议改法是：

1. 在 `createUiNcpAgent` 里把已有 `onSessionUpdated` 包一层
2. 原有回调继续保留
3. 顺手把 `sessionId` 通知给 `SessionSearchFeatureService.handleSessionUpdated`

这样我们就不需要：

1. 改 toolkit session persistence 主逻辑
2. 改 session manager 底层结构
3. 加新的全局 event bus 事件

### 11.3 tool 接入

利用现有 `getAdditionalTools` 扩展点，而不是修改 core tool registry 的默认工具集合。

也就是说，在 [create-ui-ncp-agent.ts](../../packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts) 里：

1. 继续保留已有 asset / MCP tool 注入
2. 再追加 `sessionSearchFeature.createTool(...)`

这样我们就不需要：

1. 修改 `@nextclaw/core` 的工具集合
2. 修改 `sessions.ts`
3. 修改 `nextclaw-ncp-tool-registry.ts` 的默认注册逻辑

这是 feature 可插拔设计里最重要的一步。

## 12. 启动与同步策略

第一版建议：

1. feature 初始化时做一次轻量 reconcile
2. 之后走增量更新

reconcile 逻辑：

1. 遍历 `NextclawAgentSessionStore.listSessions()`
2. 对比 `session.updatedAt` 与本地索引 meta
3. 只重建缺失或过期 session

这样好于两种极端：

1. 每次启动都全量重建：太重
2. 完全不 reconcile：旧 session 搜不到

## 13. 为什么不把它做进现有 sessions.ts

这是本设计里另一个要明确拒绝的路线。

不要把 `session_search` 继续塞进：

- [sessions.ts](../../packages/nextclaw-core/src/agent/tools/sessions.ts)

原因：

1. `sessions_list`、`sessions_history`、`session_search` 语义完全不同
2. 继续往一个工具文件里加能力，只会把边界越做越糊
3. 这和本次“让 feature 独立可删”的目标是反着来的

推荐原则：

1. `sessions_history` 继续只做“定向读某个 session”
2. `session_search` 是独立新工具

## 14. 删除成本评估

如果按本方案实现，未来删除 `session_search` 的路径应收敛为：

1. 删除 `packages/nextclaw/src/cli/commands/ncp/session-search/`
2. 删除 `create-ui-ncp-agent.ts` 中的初始化
3. 删除 `onSessionUpdated` 的 feature 链接
4. 删除 `getAdditionalTools` 中的 tool 注入
5. 删除本地 `session-search.db`

这就是本方案的核心价值：

**删除 feature 的成本是“删一个模块 + 几个接缝”，而不是“从多层基础设施里逆向拆产品逻辑”。**

## 15. 方案自我审查

这部分是对本设计主动挑刺。

### 15.1 我认为好的地方

1. 主实现完全留在 NextClaw 产品层，没有污染 toolkit。
2. 接入点很少，主要利用已存在的两个缝：
   - `onSessionUpdated`
   - `getAdditionalTools`
3. `session_search` 的索引被明确当成派生索引，而不是主 session 数据。
4. 删除成本清楚，未来不满意时容易整体回退。

### 15.2 我认为仍需警惕的地方

1. `SessionSearchFeatureService` 不能继续膨胀成“索引 + 查询 + 生命周期 + 统计 + 配置 + 后台任务”全都管的大类。
2. `session-search-store.service.ts` 不能演变成半个 ORM。
3. 启动 reconcile 必须做增量，而不是偷懒做全量重建。
4. 不能因为以后要给 UI 用，就提前把 UI concerns 混进第一版类型和返回结构里。

### 15.3 如果后续发现这版仍然偏重，优先删哪里

如果实现时仍然觉得偏重，优先删减顺序应该是：

1. 先删复杂过滤参数
2. 先删过度抽象的 store / helper
3. 保留：
   - feature owner
   - index manager
   - query service
   - tool

不要反过来删 owner，只留一堆零散 helper。

## 16. 最终建议

最终建议只保留一句话：

**把 `session_search` 做成 NextClaw 产品层自己的独立 feature module，通过 `onSessionUpdated` 和 `getAdditionalTools` 两个最小接缝轻量接入；不要把主实现塞进 toolkit，也不要继续堆进现有 sessions 工具文件。**
