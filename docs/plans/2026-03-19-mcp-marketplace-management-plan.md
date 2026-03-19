# MCP Marketplace And Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 NextClaw 增加一套面向 MCP server 的 marketplace 与管理能力，覆盖 catalog 发现、安装、配置、启停、诊断与前端管理，同时保持 MCP 作为独立平台域，不把现有 plugin/skill 体系继续搅成一个更大的泛型泥球。

**Architecture:** 复用现有 marketplace 的边界形状，而不是复用它的全部类型分支。MCP 作为与 plugin、skill 平行的第三个域存在：catalog 走 marketplace worker，安装/管理走 server controller，真正的配置写入、diagnostics、hot reload、installed view 聚合统一下沉到 `@nextclaw/mcp` 域服务，CLI 和前端都只做 adapter。

**Tech Stack:** `@nextclaw/mcp`、`@nextclaw/core`、`nextclaw` CLI、`nextclaw-server` UI router、`nextclaw-ui` React + React Query、marketplace worker（D1 + R2/对象存储元数据流）、现有 MCP hotplug/reload 基础设施。

---

## 1. 深层意图与推荐方案

用户要的不是“把 skill/plugins 页面复制一份，换个名字叫 MCP”，而是：

1. 让 MCP 也具备真正的产品级 discover/install/manage 闭环。
2. 保持现有代码边界清楚，不为支持第三类 marketplace item 把所有页面、接口、类型都改成三路分支大杂烩。
3. 继续坚持 MCP 是平台级基础设施，而不是某个 runtime 或某个 UI 页面专属附属品。

我的推荐是：

- **在产品层复用 marketplace 心智，在代码层保持 MCP 独立域。**
- **不把现有 `MarketplaceItemType = plugin | skill` 直接扩成 `plugin | skill | mcp` 后强行把所有现有逻辑都推成三分支。**
- **新增独立的 `MCP catalog + MCP installed/manage` 纵向切片，但 API 风格、UI 布局语言、worker 元数据机制对齐 skill/plugins。**

这条路线最符合“解耦、可插拔、清晰可维护”的要求：

- 对用户来说，MCP 仍然在同一套 marketplace 体验内。
- 对实现来说，MCP 的安装语义、配置语义、诊断语义都和 plugin/skill 明显不同，不会为了“表面统一”制造长期复杂性。

## 2. 当前现状与设计基线

当前仓库已经有两条成熟参考线：

1. **Plugin / Skill marketplace 链路**
   - worker 已有 `plugins` / `skills` catalog 与 detail/recommendation 数据
   - `nextclaw-server` 已有 `/api/marketplace/plugins/*` 与 `/api/marketplace/skills/*`
   - `nextclaw-ui` 已有 marketplace 页面、installed 视图、install/manage mutation、详情面板

2. **MCP 平台基础设施**
   - `@nextclaw/mcp` 已有 registry、doctor、lifecycle、hot reconcile
   - `nextclaw mcp add/remove/enable/disable/doctor/list` 已可用
   - 常驻 service 与 native NCP runtime 已支持 MCP hot reload / hot unplug

因此 MCP marketplace 不应该重复发明：

- catalog worker 基础协议
- server 代理 marketplace upstream 的模式
- 前端 marketplace 页面的视觉/交互语言
- 热插拔基础设施

但它也不应该被硬塞进 plugin/skill 当前的数据模型，因为 MCP 的本体不是“安装一个 package”或“下载一个 skill”，而是“生成/保存一个可热插拔的 server definition，并附带 marketplace provenance 与输入模板”。

## 3. 设计原则

### 3.1 MCP 是独立域，不是 plugin/skill 子类

MCP item 的安装产物不是：

- plugin package
- skill directory

而是：

- `config.mcp.servers.<name>` 下的一份 `McpServerDefinition`

所以我们不新增 `mcp.installs` 这种平行真相，也不复用 plugin install record 模型。  
MCP 的“已安装”真相就是 registry config 本身。

### 3.2 复用边界，不复用错误抽象

应复用：

- marketplace worker 的 catalog/detail/content/recommendation 端点模式
- server controller 的 typed route / proxy / manage action 模式
- frontend 的 catalog + installed + detail pane + modal + optimistic refresh 模式

不应复用：

- plugin 的 canonical npm spec 解析
- skill 的 uninstall-only manage 模型
- `MarketplaceItemType` 全面泛型化后到处加 `if (type === "mcp")`

### 3.3 UI 管理必须围绕“配置 + 诊断”而不是“下载包”

MCP 的核心管理动作应该是：

- 安装模板
- 录入变量 / secret / headers / url / args
- 选择作用域
- 启用 / 禁用
- 编辑
- duplicate / rename
- doctor
- remove

而不是只做一个“Install”按钮。

### 3.4 默认就是公共资源池

同一个 MCP server 在产品默认语义上应被视为**平台公共资源**，安装后默认对所有 agent 可用。

本方案明确：

- 不做 per-runtime 可见性管理
- 不做 per-session 可见性管理
- 仍沿用现有 `scope.allAgents + scope.agents[]` 模型
- marketplace 安装默认值应为：
  - `allAgents = true`
  - `agents = []`
  - 即“默认全局可用”
- `agents[]` 只作为高级可选项保留，用于极少数想收口能力面的用户
- 安装弹窗和后续编辑页都必须显式展示当前 scope，但不应把默认流程做成细粒度授权配置

### 3.5 CLI / Server / UI 必须共用同一套域服务

不能出现：

- CLI 自己改 config
- server controller 再自己改一套 config
- 前端又拼一套 install body

推荐把真正的 MCP mutation / installed view / marketplace install materialization 下沉到 `@nextclaw/mcp`，由：

- CLI 调用
- server controller 调用
- 未来脚本或别的 runtime/automation 也可调用

## 4. 产品范围

## 4.1 P1 必须包含

1. MCP catalog 浏览
2. MCP detail / README / 文档内容查看
3. 从 marketplace 安装 MCP server 模板
4. 已安装 MCP server 列表
5. enable / disable / remove
6. doctor
7. 编辑基础配置（name、scope、transport inputs、policy）
8. 将 marketplace 安装项与手工 `mcp add` 项统一展示在 installed/manage 页面
9. 前端接入
10. 保持 hotplug：安装、启停、删除后运行中的服务可热生效

## 4.2 P1 明确不做

1. 不做 per-runtime visibility
2. 不做自动信任任意三方命令
3. 不做 marketplace 自动后台安装 npm 包并绕过用户确认
4. 不做多 runtime adapter 扩展规划外的首发实现
5. 不做 provider-like secrets 系统重造；优先复用现有 secrets/config 机制
6. 不在 legacy chat 链路新增 MCP UI

## 5. 目标用户体验

### 5.1 前端

新增独立 MCP 页面，推荐路由：

- `/marketplace/mcp`

页面分两个主视角：

1. `Catalog`
   - 搜索
   - 标签筛选
   - 推荐位
   - item 卡片
   - 详情 panel / doc browser
   - 安装弹窗

2. `Installed`
   - 已安装 server 列表
   - 状态、transport、scope、来源、最近诊断结果
   - enable / disable / doctor / edit / duplicate / remove

### 5.2 CLI

保留现有低层命令：

- `nextclaw mcp add`
- `nextclaw mcp list`
- `nextclaw mcp doctor`
- `nextclaw mcp enable`
- `nextclaw mcp disable`
- `nextclaw mcp remove`

后续可选补齐 marketplace-aware CLI：

- `nextclaw mcp install <slug>`
- `nextclaw mcp search <query>`
- `nextclaw mcp info <slug>`

但 P1 不强依赖 CLI marketplace 命令，避免把范围做爆。

## 6. 域模型设计

### 6.1 Catalog item

新增 MCP catalog 元数据类型，独立于 plugin/skill：

```ts
type McpCatalogItem = {
  id: string;
  slug: string;
  type: "mcp";
  name: string;
  summary: string;
  summaryI18n?: Record<string, string>;
  description?: string;
  descriptionI18n?: Record<string, string>;
  tags: string[];
  vendor?: string;
  homepage?: string;
  docsUrl?: string;
  iconUrl?: string;
  transportTypes: Array<"stdio" | "http" | "sse">;
  install: McpCatalogInstallTemplate;
  trust: {
    level: "official" | "verified" | "community";
    notes?: string;
  };
};
```

### 6.2 Install template

MCP 安装不是下载资产，而是把模板 materialize 成 `McpServerDefinition`。

```ts
type McpCatalogInstallTemplate = {
  kind: "template";
  defaultName: string;
  defaultScope: {
    allAgents: false;
    agents: string[];
  };
  transportTemplate:
    | {
        type: "stdio";
        command: string;
        args: string[];
        cwd?: string;
        env?: Record<string, string>;
        stderr?: "pipe" | "inherit" | "ignore";
      }
    | {
        type: "http";
        url: string;
        headers?: Record<string, string>;
        timeoutMs?: number;
        verifyTls?: boolean;
      }
    | {
        type: "sse";
        url: string;
        headers?: Record<string, string>;
        timeoutMs?: number;
        verifyTls?: boolean;
        reconnect?: {
          enabled: boolean;
          initialDelayMs: number;
          maxDelayMs: number;
        };
      };
  inputs: McpCatalogInputField[];
};
```

其中 `inputs` 用于前端生成安装表单，例如：

- url
- API key / token
- header value
- env value
- command arg placeholder
- 是否启用 TLS 校验

### 6.3 Installed record

已安装记录不另起平行 install map，而是基于 `mcp.servers` 聚合得到 view model：

```ts
type McpInstalledRecord = {
  name: string;
  enabled: boolean;
  transport: "stdio" | "http" | "sse";
  scope: {
    allAgents: boolean;
    agents: string[];
  };
  source: "manual" | "marketplace";
  catalogSlug?: string;
  displayName?: string;
  installedAt?: string;
  accessible?: boolean;
  toolCount?: number;
  lastDoctorAt?: string;
  lastError?: string;
};
```

### 6.4 Provenance metadata

推荐给 `McpServerDefinition` 增加可选 metadata：

```ts
metadata?: {
  source: "manual" | "marketplace";
  catalogSlug?: string;
  catalogVersion?: string;
  displayName?: string;
  vendor?: string;
  docsUrl?: string;
  installedAt?: string;
}
```

原因：

- MCP 安装产物本来就是 config entry
- provenance 紧贴配置最简单
- 不需要维护 `mcp.installs` 与 `mcp.servers` 两份易漂移状态

## 7. API 与服务边界

### 7.1 Marketplace worker

新增 MCP catalog upstream：

- `GET /api/v1/mcp/items`
- `GET /api/v1/mcp/items/:slug`
- `GET /api/v1/mcp/items/:slug/content`
- `GET /api/v1/mcp/recommendations`

元数据存储延续当前 marketplace worker 机制：

- 结构化 summary / tags / install template 等放 D1
- 长文档 content / README 放对象存储

### 7.2 nextclaw-server

新增平行 MCP route family：

- `GET /api/marketplace/mcp/items`
- `GET /api/marketplace/mcp/items/:slug`
- `GET /api/marketplace/mcp/items/:slug/content`
- `GET /api/marketplace/mcp/recommendations`
- `GET /api/marketplace/mcp/installed`
- `POST /api/marketplace/mcp/install`
- `POST /api/marketplace/mcp/manage`
- `POST /api/marketplace/mcp/doctor`

其中：

- `install`：把 catalog template + 用户输入 materialize 为 server definition，并写入 registry
- `manage`：enable / disable / remove / update / duplicate / rename
- `doctor`：返回诊断详情，供 UI 展示

### 7.3 @nextclaw/mcp 域服务

推荐新增的核心服务：

- `McpCatalogClient`
  - 拉取 worker catalog/detail/content/recommendations
- `McpInstallTemplateMaterializer`
  - 把 marketplace template + 用户输入转成 `McpServerDefinition`
- `McpMutationService`
  - add / update / remove / enable / disable / duplicate / rename
- `McpInstalledViewService`
  - 从 config + registry warm state + doctor 聚合 installed 列表
- `McpDoctorFacade`
  - 包装当前 doctor service 供 server / CLI / UI 统一复用

### 7.4 CLI

CLI 只保留 adapter 责任：

- 参数解析
- JSON / human-readable 输出
- 调用 `@nextclaw/mcp` 域服务

避免继续把 config write 逻辑留在 `packages/nextclaw/src/cli/commands/mcp.ts`。

## 8. 前端方案

## 8.1 页面结构

推荐新增独立页面，而不是继续膨胀现有 `MarketplacePage`：

- 新页面：`McpMarketplacePage`
- 新 hook：`useMcpMarketplace`
- 新 API client：`api/mcp-marketplace.ts`
- 可复用现有列表卡片、详情 pane、搜索/排序/安装 modal 的视觉结构

原因：

- 现有 `MarketplacePage` 已经围绕 `plugin | skill` 积累了大量分支
- MCP 的 installed row、install form、doctor panel 都明显不同
- 继续硬泛型化会让页面复杂度陡增

更好的路线是：

- 保留共享 UI primitives
- 独立 MCP 页面状态机

### 8.2 Catalog 视图

每个 MCP item 卡片展示：

- 名称 / vendor
- transport 标识
- trust level
- 标签
- 简介
- Installed / Enabled / Disabled 状态
- Install / Configure / Doctor 按钮

详情面板展示：

- README / 文档内容
- transport 说明
- 所需输入
- 默认 scope
- 安全提示
- 最近更新时间

### 8.3 Install / Edit Modal

安装与编辑使用同一套 schema-driven form：

- 基础字段：server name、enabled、scope
- transport 字段：command/args/url/headers/env/timeout/reconnect
- secret 字段：优先写 secret ref，而不是明文直接进 config

安装流程：

1. 读取 catalog template
2. 填充用户输入
3. 预览生成后的 server summary
4. 确认写入
5. UI 等待热插拔完成
6. 刷新 installed view

### 8.4 Installed 视图

列表字段建议包括：

- 名称
- transport
- scope 摘要
- 来源（manual / marketplace）
- 状态（enabled / disabled / unresolved / error）
- toolCount
- 最近 doctor 时间

行级动作：

- Enable
- Disable
- Doctor
- Edit
- Duplicate
- Remove

### 8.5 实时刷新

当前 websocket 已会在 config 更新后 invalidates marketplace installed/plugin 相关 query。  
MCP 方案要补：

- `config.updated path=mcp`
- installed query invalidation
- item 状态 query invalidation
- doctor result query invalidation

## 9. 安装与管理语义

### 9.1 Marketplace 安装

MCP marketplace install 的真实含义是：

- 从 catalog 选择一个“受支持的 server recipe”
- 让用户显式提供必填输入
- 生成一份 registry config
- 立即热生效

不是：

- 直接下载未知资产并自动执行

### 9.2 Manual entry 兼容

用户通过 CLI 手工 `nextclaw mcp add ...` 创建的 server 也必须在前端管理页可见。

但这类记录可能：

- 没有 catalogSlug
- 没有 README
- 没有 marketplace detail

UI 对此应展示：

- `source = manual`
- 可管理、可 doctor、可 edit、可 remove
- 没有 marketplace content 时显示本地配置摘要

### 9.3 Duplicate / Rename

MCP server 与 plugin/skill 的重要差异是：

- 同一个 catalog item 可能要装多份实例
- 每份实例用不同名称、不同 token、不同 URL、不同 scope

所以 management 必须原生支持：

- duplicate existing server
- rename existing server

而不是只支持 enable / disable / uninstall。

## 10. 安全与策略

### 10.1 默认 trust

marketplace 安装后的 policy 默认：

- `trust = explicit`
- `start = eager` 可作为官方 recipe 默认值

但 UI 必须清楚展示：

- 这是一个外部命令 / 外部 endpoint
- 会暴露哪些工具
- 是否使用网络
- 是否需要凭证

### 10.2 Secret 输入

任何 token / API key / header secret：

- UI 不直接鼓励写死到明文 config
- 优先通过现有 secrets 体系写引用

### 10.3 默认 all-agents，但允许高级收口

无论是 marketplace 安装还是 duplicate/edit，默认都应保持 `all-agents`。

如果用户确实有隔离需求：

- 可以在高级设置里切换为指定 agent
- 但这不是默认安装流程的前置门槛
- UI 不应让用户误以为“安装完还要再授权一轮才算可用”

## 11. 推荐文件边界

### 11.1 marketplace worker

- `workers/marketplace-api/src/.../mcp-*`
- 新增 `mcp` catalog schema / route / repository

### 11.2 @nextclaw/mcp

- `packages/nextclaw-mcp/src/catalog/*`
- `packages/nextclaw-mcp/src/install/*`
- `packages/nextclaw-mcp/src/manage/*`
- `packages/nextclaw-mcp/src/view/*`

### 11.3 server

- `packages/nextclaw-server/src/ui/router/marketplace/mcp.controller.ts`
- `packages/nextclaw-server/src/ui/router/marketplace/mcp.installed.ts`
- `packages/nextclaw-server/src/ui/router/marketplace/index.ts`
- `packages/nextclaw-server/src/ui/types.ts`

### 11.4 frontend

- `packages/nextclaw-ui/src/api/mcp-marketplace.ts`
- `packages/nextclaw-ui/src/api/types.ts`
- `packages/nextclaw-ui/src/hooks/useMcpMarketplace.ts`
- `packages/nextclaw-ui/src/components/marketplace/mcp/McpMarketplacePage.tsx`
- `packages/nextclaw-ui/src/components/marketplace/mcp/*`
- `packages/nextclaw-ui/src/App.tsx`

### 11.5 CLI

- `packages/nextclaw/src/cli/commands/mcp.ts`
- 可选补充 `packages/nextclaw/src/cli/runtime.ts`

## 12. 分阶段落地计划

### Task 1: 收口 MCP 域服务

**Files:**
- Modify: `packages/nextclaw-mcp/src/**`
- Modify: `packages/nextclaw/src/cli/commands/mcp.ts`
- Test: `packages/nextclaw-mcp/tests/**`

**目标：**

- 把 registry mutation / installed view / doctor facade 从 CLI 适配层收口到 `@nextclaw/mcp`
- 为 server/UI 复用做好基础

### Task 2: 定义 MCP catalog contract

**Files:**
- Modify: `workers/marketplace-api/src/**`
- Modify: `packages/nextclaw-server/src/ui/types.ts`
- Modify: `packages/nextclaw-ui/src/api/types.ts`

**目标：**

- 定义 item summary / detail / content / install template / installed view / manage action contract
- 保持独立于 plugin/skill 类型

### Task 3: 打通 worker 与 server controller

**Files:**
- Create: `packages/nextclaw-server/src/ui/router/marketplace/mcp.controller.ts`
- Modify: `packages/nextclaw-server/src/ui/router.ts`
- Modify: `packages/nextclaw-server/src/ui/router/marketplace/index.ts`
- Test: `packages/nextclaw-server/src/ui/router.marketplace-*.test.ts`

**目标：**

- 建立 `/api/marketplace/mcp/*`
- 接入 install/manage/doctor/installed

### Task 4: 做 MCP 前端页面

**Files:**
- Create: `packages/nextclaw-ui/src/components/marketplace/mcp/*`
- Create: `packages/nextclaw-ui/src/hooks/useMcpMarketplace.ts`
- Create: `packages/nextclaw-ui/src/api/mcp-marketplace.ts`
- Modify: `packages/nextclaw-ui/src/App.tsx`
- Test: `packages/nextclaw-ui/src/components/marketplace/mcp/*.test.tsx`

**目标：**

- 提供 catalog + installed + detail + install/edit modal
- 对手工和 marketplace 安装项统一管理

### Task 5: 补 CLI marketplace 能力（可选 P2）

**Files:**
- Modify: `packages/nextclaw/src/cli/commands/mcp.ts`
- Modify: `docs/USAGE.md`
- Test: `packages/nextclaw/src/cli/**/*.test.ts`

**目标：**

- `mcp install/search/info`
- 与 UI 共享相同 catalog client / materializer

### Task 6: 冒烟与发布闭环

**Files:**
- Modify: `docs/USAGE.md`
- Modify: `docs/logs/...`
- Test: MCP e2e / worker route / server route / UI smoke

**目标：**

- catalog 安装一个 stdio MCP server
- UI 里 enable/disable/remove/doctor 全链路通过
- 热插拔行为持续成立

## 13. 验证策略

### 自动化

- worker contract tests
- server route tests
- `@nextclaw/mcp` domain unit tests
- UI page tests
- CLI smoke tests

### 冒烟

最小闭环应覆盖：

1. marketplace 中安装一个 stdio recipe
2. 默认 scope 为 `all-agents`
3. 运行中 service 无需 restart 即可看到新 server
4. doctor 能发现工具并自行退出
5. disable / enable / remove 都是热插拔
6. manual `mcp add` 创建的 server 能出现在 UI manage 页面

## 14. 风险与取舍

### 风险 1：把现有 marketplace 泛型继续做大

后果：

- `plugin | skill | mcp` 分支会扩散到 UI、server、worker、types 全链路
- 以后第四种 item 更难收拾

应对：

- 维持独立 MCP 垂直切片
- 只抽共享 primitives

### 风险 2：重复维护 install record 与 server definition

后果：

- 状态漂移
- remove/rename/duplicate 都会变复杂

应对：

- 以 `mcp.servers` 为唯一安装真相
- provenance metadata 就地挂在 definition 上

### 风险 3：默认公共资源池带来能力面过宽

后果：

- 一个安装动作把外部工具暴露给全部 agent

应对：

- 在安装确认和详情页明确展示来源、transport、命令/endpoint 与 trust 信息
- 保留高级 scope 收口能力，但不把它设为默认门槛
- 通过来源信任、secret 管理、doctor 可见性来控制风险，而不是默认收紧可见性

## 15. 最终推荐

最终建议一句话概括：

**做一个“借鉴 marketplace 体验，但保持 MCP 独立域模型”的方案。**

对外：

- 用户看到的是 skill/plugins 风格一致的 marketplace 与管理界面

对内：

- `@nextclaw/mcp` 成为 MCP 的唯一业务核心
- server / CLI / UI 只是适配层
- 不通过扩张旧泛型页面来获得表面统一

这会是当前仓库里长期最稳、最清晰、后续也最容易扩展的一条路。
