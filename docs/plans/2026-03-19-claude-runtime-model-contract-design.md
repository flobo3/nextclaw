# Claude Runtime Model Contract Design

## 目的

这份设计只回答一个问题：

- 在 `NextClaw` 的产品语境里，`Claude` 会话类型与“模型选择”到底应该如何契约化。

要求是：

- 不靠臆想
- 只基于当前仓库实现、Anthropic 官方文档、以及本地已安装 SDK 可验证能力
- 明确区分“已确认能做 / 已确认不能直接承诺 / 必须运行时探测后才可承诺”

## 结论先行

`NextClaw` 应继续坚持“模型是一等公民，runtime 是执行器”的产品心智。

因此：

- 用户在会话里选中的 `preferred_model` 仍然是单一真相
- `session_type=claude` 的含义应是“使用 Claude Code / Claude Agent SDK 这套 runtime 执行”
- 但 `Claude` runtime 不能被设计成“天然支持所有 NextClaw 模型”
- 也不能被设计成“产品上只允许 Claude 自家模型”

正确契约是：

- `Claude` runtime 只承诺运行“当前认证方式 + 当前 gateway/proxy/provider 配置下，Claude SDK 实际声明自己支持的模型”
- 在产品落地上，优先把 `Anthropic-format gateway` 定成一等路径
- 第一优先默认方案直接采用 `LiteLLM`
- 前端显示给用户的可选模型，应该是“NextClaw 全局模型目录”与“Claude runtime 运行时探测结果”的交集

换句话说：

- `Codex` 现在更接近“配置映射型 runtime”
- `Claude` 应升级为“能力探测型 runtime”

## 已确认事实

### 0. 2026-03-19 本机运行时补充验证

这部分是本次在 `nextbot` 本机仓库里，基于当前安装的

- `@anthropic-ai/claude-agent-sdk@0.2.63`
- `claude_code_version=2.1.63`

做出的真实补充验证，优先级高于任何臆测。

已确认：

- Claude Agent SDK 的 `query/session` 路径默认不会自动读取 `~/.claude/settings.json`
- 只有显式传入 `settingSources: ["user"]` 后，`initializationResult().account.tokenSource` 才能读到用户级 `ANTHROPIC_AUTH_TOKEN`
- 单靠 `supportedModels()` 不能代表“真实可回复”
- 在当前机器上，即使已经读到 `ANTHROPIC_AUTH_TOKEN`，真实推理仍可能返回
  - `Failed to authenticate. API Error: 403 用户没有有效的claudecode订阅`
- 因此 `Claude ready` 不能再靠“SDK 能初始化 + models 能列出来”判定，必须基于一次真实执行探测

还确认了一个很关键的负面事实：

- 在本机对当前 JS CLI 路径做最小实验时，显式设置本地 `ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN` 并不能让 `query()` 真正打到本地 stub relay
- 也就是说，至少在当前验证到的 `claude-agent-sdk/js cli` 路径上，“立刻在 NextClaw 内嵌一个本地 Anthropic relay 然后直接跑通 Claude 回复”这条路当前不能被当成已可执行结论

所以本轮产品与实现必须遵守：

- 默认优先 Claude 自身 settings / gateway / auth
- 默认不再把 NextClaw provider `apiKey/apiBase` 直接覆盖到 Claude runtime
- `ready` 必须由真实执行探测兜底

### 1. NextClaw 当前产品模型已经是统一心智

当前 NCP 会话发送链路里，前端会把用户选中的模型写入消息 metadata：

- [`packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx`](../../packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx)

服务端桥接层会继续把 `model/preferred_model` 归一化并透传到 session metadata：

- [`packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-message-bridge.ts`](../../packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-message-bridge.ts)

这说明 `NextClaw` 当前正确的产品语义已经是：

- 先有统一模型选择
- 再由 runtime 消费这个模型

### 2. Codex runtime 当前就是“跟随会话模型”

`Codex` NCP runtime 插件优先读取：

- `sessionMetadata.preferred_model`
- 然后才回退插件配置
- 再回退 `agents.defaults.model`

实现位置：

- [`packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.ts`](../../packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.ts)

这与当前产品心智一致。

### 3. Claude runtime 当前代码结构也已经在复用同一套模型链路

当前 `Claude` NCP runtime 插件同样优先读取：

- `sessionMetadata.preferred_model`
- `sessionMetadata.model`
- `pluginConfig.model`
- `config.agents.defaults.model`

实现位置：

- [`packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/index.ts`](../../packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/index.ts)

也就是说，当前代码基础本来就更接近“统一模型体系”，而不是“Claude 自带独立模型体系”。

### 4. Anthropic 官方已确认 Claude SDK 支持显式模型参数

官方文档：

- Agent SDK TypeScript: <https://docs.claude.com/en/docs/agent-sdk/typescript>
- Claude Code SDK overview: <https://docs.claude.com/en/docs/claude-code/sdk/sdk-overview>

本地已安装 SDK 源码也可验证：

- `query(..., { options: { model } })` 是官方能力
- `Query` 暴露了 `supportedModels()`
- `Query` 暴露了 `setModel()`
- `Query` 暴露了 `initializationResult()`

本地源码位置：

- `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.63_zod@4.3.6/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs`

这说明：

- “Claude runtime 完全不能接受模型输入”是错误判断
- “Claude runtime 支持运行时探测自己当前可用模型”是已确认能力

### 5. Anthropic 官方确认 Claude Code 支持 Bedrock / Vertex / gateway / proxy

官方文档：

- Bedrock / Vertex / proxies: <https://docs.claude.com/en/docs/claude-code/bedrock-vertex-proxies>
- LLM gateway: <https://docs.claude.com/en/docs/claude-code/llm-gateway>

这说明：

- `Claude` runtime 不应在产品层被直接等同于“只能 Anthropic 直连 Claude 模型”
- 通过符合 Claude Code 约定的 gateway / proxy，技术上可以承接更多来源的模型

但这不等于：

- Claude runtime 可以无条件承诺支持 `NextClaw` 当前所有模型

因为官方支持的是“经 Claude Code 兼容层后的 provider/gateway 路径”，不是“任意模型名天然可跑”。

### 6. LiteLLM 是官方可接受且最适合 NextClaw 快速落地的默认 gateway

官方 gateway 文档直接以 `LiteLLM` 作为示例。

这意味着两件事：

- `LiteLLM` 不是旁门左道，而是 Claude Code 官方接受的接入路径
- 对 NextClaw 来说，优先选择 `LiteLLM` 做默认 gateway，比自研一层 `OpenAI -> Anthropic` 转换网关更快、更现实

这里要强调的边界是：

- 不是让 Claude Code 直接打 OpenAI `chat/completions`
- 而是让 `LiteLLM` 对 Claude 暴露 `Anthropic Messages API`

因此在产品方案上，应把 `LiteLLM` 视为 Claude 会话的默认推荐网关，而不是“可选实验方案”。

## 已确认不能直接承诺的事情

下面这些事情，在官方资料和当前仓库状态下都不能直接承诺：

### 1. 不能承诺 Claude runtime 支持 NextClaw 当前全部模型

原因：

- Anthropic 官方支持的是 Claude runtime 的认证和网关接入能力
- 但第三方模型是否能在该 gateway 下完整支持 Claude runtime 所需的能力，不是官方一刀切担保

### 2. 不能承诺第三方模型与 Claude 官方模型拥有完全一致能力

尤其不能直接承诺以下能力在所有第三方模型下都稳定一致：

- tools / tool calling
- partial messages
- resume / session continuation
- thinking / max thinking tokens
- system prompt / append system prompt 行为一致

### 3. 不能靠静态 provider 前缀名单做最终判断

例如只写：

- `anthropic/*` 可用
- `openrouter/*` 可用
- `dashscope/*` 不可用

这种规则过于粗糙。

真正决定能不能跑的是：

- 当前 Claude runtime 的认证方式
- 当前 gateway / proxy 的协议兼容程度
- 当前 SDK 返回的 supported models

## 产品设计原则

### 1. 统一产品心智不变

在 `NextClaw` 里：

- 模型选择仍是产品的一等公民
- `session_type` 仍只是运行时选择

用户心智应保持：

1. 我选择一个模型
2. 我选择一个会话类型
3. 产品告诉我这个组合是否可运行

### 2. Claude 不做特权产品，不做独立模型宇宙

不新增“Claude 专属模型配置系统”。

Claude 插件只负责：

- Claude runtime 的执行能力
- Claude 所需的 auth / executable / sandbox / gateway 附加配置

而不负责替代 `NextClaw` 现有 provider/model 体系。

### 3. 是否支持某个模型，必须由 runtime 自己声明

前端和服务端都不应再用“猜测规则”判断 Claude 可用模型。

应改为：

- Claude runtime 在当前配置下产出一份 capability snapshot
- 产品侧只消费这份 snapshot

### 4. “交集判定”必须下沉到系统内部，不能变成用户负担

“全局模型目录 ∩ Claude capability”是内部实现逻辑，不应直接暴露成用户心智。

用户不应该经历这样的流程：

1. 自己猜 Claude 能不能用
2. 自己猜该选哪个 provider / model
3. 发一条消息后才发现不支持

用户应看到的是：

1. 我安装了 Claude 插件
2. 系统明确告诉我 Claude 是否 ready
3. 如果没 ready，系统明确告诉我缺什么
4. 如果 ready，系统只给我当前真能用的模型

### 5. 默认行为必须“前置成功”，而不是“失败后兜底”

这份方案不是为了做更复杂的失败处理，而是为了把失败尽量挡在进入对话前。

因此默认行为应是：

- 在创建 Claude 会话前，就知道 Claude 是否 ready
- 在进入 Claude 会话时，就已经有一个可发送的默认模型
- 在配置变化导致模型失效时，优先自动切换到可用模型，并明确告知用户，而不是保留失效状态直到发送时报错

## UX-First 产品流程

下面这段才是用户真正会经历的产品流程。

### 新安装用户的目标流程

1. 用户安装 `Claude` 插件。
2. 安装成功后，系统立即在后台执行 Claude runtime readiness check。
3. 检查结果直接反馈到插件卡片和聊天入口，而不是藏在日志里。
4. 若 Claude 未就绪，系统给出明确 CTA：
   - 去 `Providers`
   - 或去补 `apiBase`
   - 或去补 Claude executable
5. 若 Claude 已就绪，聊天页左侧“新任务”菜单里的 `Claude` 立即可用。
6. 用户选择 `Claude` 新建会话时，底部模型下拉默认就是“Claude 当前可用模型列表”，并自动选中推荐模型。
7. 用户无需猜测是否能发，输入框默认就是可发送状态。

### 新安装用户的默认推荐路径

新用户不应被要求先理解：

- Anthropic 原生直连
- Bedrock
- Vertex
- gateway 兼容层

默认推荐路径应直接是：

1. 安装 Claude 插件
2. 使用 `LiteLLM` 作为 Claude gateway
3. 在 `Providers` 中新增或选择一个指向 LiteLLM 的 provider
4. 填入 `apiBase` 和 `apiKey`
5. 在这个 provider 下配置想暴露给 Claude 会话的模型
6. 回到聊天页，直接创建 Claude 会话并开聊

也就是说，产品文案和引导里应直接写：

- “推荐：使用 LiteLLM 作为 Claude gateway”

而不是把用户丢到一堆等价选项里自己猜。

### 新安装用户在现有 NextClaw 页面中的具体操作

按当前产品导航，目标流程应具体落在这些页面与控件：

1. 用户在左侧点 `Settings`
2. 进入 `Marketplace / Plugins`
3. 搜索并安装 `Claude` 插件
4. 安装后插件卡片直接显示 readiness 状态：
   - `Ready`
   - `Setup required`
   - `Unsupported config`
5. 如果是 `Setup required`，卡片上直接给 CTA：
   - `Use LiteLLM gateway`
   - `Configure provider`
   - `Configure runtime`
6. 用户完成配置后，返回 `/chat`
7. 左侧 `新任务` 按钮右侧下拉中可以看到 `Claude`
8. 若 Claude 已 ready，点击即直接创建 Claude 会话
9. 会话底部模型下拉只展示 Claude 当前可用模型，并自动选中一个推荐模型
10. 用户直接输入消息并发送

### LiteLLM 路径下的具体产品使用步骤

这是当前建议写进产品文案和帮助提示里的默认流程。

1. 用户进入 `Settings -> Marketplace / Plugins`
2. 安装并启用 `Claude` 插件
3. 系统提示“推荐使用 LiteLLM 作为 Claude gateway”
4. 用户进入 `Settings -> Providers`
5. 新增一个 provider，例如 `litellm-claude`
6. 配置：
   - `apiBase = http://<your-litellm-host>:4000`
   - `apiKey = <litellm key>`
7. 在该 provider 下配置准备暴露给 Claude 会话的模型，例如：
   - `claude-sonnet-4-5`
   - `kimi-k2`
   - `glm-5`
8. 回到 `/chat`
9. 点击左侧 `新任务` 右侧下拉，选择 `Claude`
10. Claude 会话里默认模型优先选择该 provider 下的推荐模型
11. 用户直接发送消息

这条路径的核心好处是：

- 用户只需要理解“Claude 会话推荐接 LiteLLM”
- 不需要自己思考“我要不要先自研一个协议转换层”

### 聊天页内的目标体验

在聊天页中，Claude 不应表现成“额外需要理解的系统”。

理想体验是：

- 会话类型下拉里看到 `Claude`
- 选择后，模型下拉自然变成“Claude 当前可用的模型”
- 如果当前会话之前选过某个 Claude 可用模型，则优先恢复它
- 如果当前模型已失效，则自动切到新的推荐模型，并出现一条轻提示

用户不应该看到：

- 一堆其实不能用于 Claude 的模型
- 空白模型选择器却不知道为什么
- 只有发消息后才知道模型不支持

## 推荐方案

## 零、自顶向下的产品决策

为了避免继续在实现上分散，先把产品决策定死：

1. `Claude` 会话默认支持 `Anthropic-format gateway`
2. 默认推荐 gateway 直接定为 `LiteLLM`
3. 不自研第一版 OpenAI -> Anthropic 代理
4. `Claude` 仍服从 NextClaw 的统一模型体系
5. Claude 会话优先消费“当前 Claude gateway provider 下的模型”

这意味着第一版产品语义应是：

- 用户要用 Claude 会话，不必先理解 Anthropic 协议细节
- 系统直接推荐 LiteLLM
- 用户只要把 LiteLLM 接进来，就能让 Claude 会话跑该 gateway 暴露出来的模型

## 一、增加 Claude Runtime Capability Snapshot

新增一份运行时能力快照，建议由 `claude` runtime 插件在初始化或配置变更后产出。

建议结构：

```ts
type RuntimeModelCapabilitySnapshot = {
  runtimeKind: "claude";
  ready: boolean;
  reason?: string;
  discoveredModels: string[];
  supportsModelSwitch: boolean;
  supportsResume: boolean | "unknown";
  supportsTools: boolean | "unknown";
  supportsPartialMessages: boolean | "unknown";
  supportsThinking: boolean | "unknown";
  authMode: "anthropic" | "bedrock" | "vertex" | "gateway" | "unknown";
  source: "sdk-supported-models" | "static-fallback";
  observedAt: string;
};
```

关键点：

- `discoveredModels` 以 SDK `supportedModels()` 结果为主
- `source` 用来区分“真实探测结果”还是“退化静态结果”
- 某些能力如果官方资料无法静态确认，就标 `"unknown"`，不要臆断

同时要新增用户可直接消费的 readiness 字段：

```ts
type RuntimeReadinessReason =
  | "missing_api_key"
  | "missing_auth"
  | "missing_executable"
  | "unsupported_gateway"
  | "no_supported_models"
  | "probe_failed";
```

这样前端才能把“为什么不能用 Claude”翻译成明确 CTA，而不是笼统报错。

## 二、模型展示改为“全局模型目录 ∩ Claude capability”

前端当前统一构造全量模型列表的位置：

- [`packages/nextclaw-ui/src/components/chat/ncp/ncp-chat-page-data.ts`](../../packages/nextclaw-ui/src/components/chat/ncp/ncp-chat-page-data.ts)

应改为按 `session_type` 过滤：

- `native`：显示全量模型
- `codex`：继续按当前逻辑显示全量模型
- `claude`：显示 `NextClaw 全局模型目录` 与 `Claude discoveredModels` 的交集

这是内部算法，但前端不应该把它呈现成抽象交集概念。

前端表现应是：

- 只展示当前 Claude 能用的模型
- 默认自动选中推荐模型
- 若无可用模型，则直接进入“需要配置”态

这样有三个好处：

- 不破坏 NextClaw “统一模型心智”
- 不让用户看到 Claude 当前根本跑不了的模型
- 不需要在产品层硬编码“Claude 只能/不能用哪些 provider”

同时加一条更激进的产品收敛：

- 第一版 Claude 会话的模型来源，优先只展示“当前被标记为 Claude gateway provider 的模型”

这样能避免把完全无关的 provider 模型都混进 Claude 下拉里。

## 三、发送前做组合校验，而不是发送后崩溃

发送前，若：

- `session_type=claude`
- 且当前 `preferred_model` 不在 `discoveredModels`

则直接阻止发送，并返回明确错误：

- 当前 Claude runtime 配置下不支持该模型
- 提供同一 runtime 当前可用的替代模型

不要再让 runtime 在实际调用时才报模糊错误。

但发送前校验只是最后一道保险，不能变成主体验。

主体验应该是：

- 会话创建前就判断 readiness
- 进入 Claude 会话时就给出可用模型
- 发送前校验只兜底处理“配置刚刚变化导致失效”的瞬时情况

## 四、配置优先级保持产品统一，但限制 fallback

Claude runtime 的模型解析建议收敛为：

1. 当前发送消息里的 `preferred_model`
2. 当前 session metadata 的 `preferred_model`
3. Claude 插件配置里的 `model`
4. `agents.defaults.model`

但第 3、4 步只有在该模型出现在 `discoveredModels` 里时才允许作为 fallback。

这意味着：

- Claude 插件不能静默覆盖用户明确选中的模型
- Claude 也不能把一个明知不受支持的默认模型硬塞进去

补充 UX 规则：

- 若当前会话没有已保存模型，则自动选中 `discoveredModels` 中的首选推荐模型
- 推荐模型优先级：
  1. 会话最近成功发送过的模型
  2. 插件配置里显式指定的模型
  3. `agents.defaults.model`，前提是它被 Claude capability 支持
  4. `discoveredModels[0]`

目标是让新用户进入 Claude 会话后“直接能发”，而不是还要额外做一次模型选择

## 五、服务端 API 也要返回 capability，而不是只返回 label

当前 `/api/ncp/session-types` 只够表达：

- 有哪些 session type

但不够表达：

- 这些 session type 当前是否 ready
- 当前各自能跑哪些模型

建议扩展返回结构，或新增 `/api/ncp/runtime-capabilities`：

```ts
type RuntimeCapabilityView = {
  kind: string;
  label: string;
  ready: boolean;
  reason?: string;
  modelSelectionPolicy: "global" | "intersection";
  supportedModels?: string[];
  supportsThinking?: boolean | "unknown";
};
```

对 `claude` 来说，`modelSelectionPolicy` 应是 `intersection`。

但仅靠这个接口还不够，建议补一份更直接的前端消费接口：

```ts
type ChatRuntimeReadinessView = {
  kind: string;
  label: string;
  ready: boolean;
  reason?: RuntimeReadinessReason;
  reasonMessage?: string;
  cta?: {
    label: string;
    href: string;
  };
  supportedModels: string[];
  recommendedModel?: string;
};
```

这样产品层就能直接实现：

- 市场页插件卡片状态
- 聊天页“新任务”菜单状态
- Claude 会话模型默认值
- 错误状态下的跳转 CTA

## 需要的产品改造

这部分是把方案变成好体验所必须补的改造，不是可选项。

### 1. Marketplace 插件卡片增加 readiness

现有 Marketplace 只有安装、启用、禁用、卸载。

需要增加：

- Claude 插件当前 readiness 状态
- 缺什么配置
- 对应 CTA

目标效果：

- 用户装完插件后，在市场页就知道 Claude 现在能不能用
- 不必先回聊天页试错

### 2. 聊天页“新任务”菜单增加状态表达

当前 `ChatSidebar` 的新任务下拉只展示 session type 名称。

需要改为能展示：

- `Claude`
- `Ready` / `Setup required`
- 必要时禁用点击或转为“点击进入配置”

目标效果：

- 用户在创建会话前就知道 Claude 当前是否可用

### 3. Claude 会话创建时自动选模型

当前模型选择更像通用输入控件。

对 Claude 来说，需要增加：

- 会话创建成功时自动绑定推荐模型
- 如果无推荐模型，直接进入未就绪引导，而不是创建一个空壳会话

### 4. 配置页增加 Claude 相关引导

现有 `Providers` 和 `Model` 页已经具备基础能力，但缺少“针对 Claude runtime 的任务导向提示”。

需要增加：

- `LiteLLM` 推荐入口或文案
- 当前 Claude readiness 所依赖的 provider 是否已配置
- 当前 `apiBase` 是否来自 Claude gateway 路径
- 当前默认模型是否被 Claude runtime 支持

目标是让用户在设置页里看到：

- “你离 Claude 可用还差哪一步”

而不是只看到抽象 provider 表单。

## 非目标

下面这些不是本轮方案目标：

- 不做 Claude 专属聊天页面
- 不新增第二套独立模型系统
- 不把所有失败都转成模糊 toast
- 不要求用户理解 capability / intersection / provider prefix 这些内部概念
- 不在第一版就自研一套 OpenAI -> Anthropic 协议网关

## 能做 / 不能做 / 待验证

## 已确认能做

- 让 Claude runtime 接受显式模型参数
- 让 Claude runtime 在当前环境下探测 `supportedModels()`
- 让 Claude runtime 通过 Bedrock / Vertex / gateway / proxy 工作
- 保持 `preferred_model` 作为 NextClaw 会话级单一真相
- 在前端根据运行时能力过滤 Claude 可选模型
- 在产品层把 readiness、推荐模型和配置 CTA 前置展示
- 直接采用 LiteLLM 作为默认推荐 gateway 路径

## 已确认不能直接做成默认承诺

- 不能默认承诺 Claude runtime 支持所有 NextClaw 模型
- 不能默认承诺所有第三方模型都具备与官方 Claude 同等的 tools/resume/thinking 能力
- 不能只靠 provider 前缀静态写死一份“Claude 支持模型名单”

## 必须运行时验证后才可承诺

- 当前用户环境下 Claude runtime 的真实可用模型集合
- 某个 gateway 下第三方模型是否支持 tools
- 某个第三方模型是否支持 resume
- thinking / partial stream 在非官方 Claude 模型下是否等价

## 实施建议

### Phase 1

- 在产品文案和配置引导中，把 LiteLLM 明确写成 Claude 默认推荐 gateway
- Claude runtime 增加 capability snapshot 生产能力
- 优先接 `supportedModels()`
- Claude 插件配置显式支持 `apiBase` 作为 gateway 地址
- 服务端补 readiness / supportedModels / recommendedModel 输出
- Providers 页增加“Claude gateway provider”识别与推荐提示
- 前端 `claude` 模型列表改成交集过滤
- Claude 会话默认模型自动选择
- 发送前增加组合校验

### Phase 2

- capability snapshot 增加 feature probes
- 把 `supportsTools/resume/thinking` 从 `"unknown"` 逐步收敛成真实值
- Marketplace 插件卡片增加 readiness 状态和 CTA
- 聊天页“新任务”菜单增加 Claude readiness 展示
- 如有必要，再考虑抽象出 LiteLLM 之外的其它 gateway 适配

## 激进落地建议

如果目标是“不要拖慢进度，先把产品路径打通”，那落地顺序应该是：

1. 直接把 `LiteLLM` 写进 Claude 文档、插件说明和设置引导
2. 把 `apiBase` 定义成 Claude gateway 地址，而不是模糊 baseUrl
3. Claude 会话默认围绕 `LiteLLM provider` 工作
4. 能力探测只做最小必需：
   - `ready`
   - `supportedModels`
   - `recommendedModel`
5. 先打通“安装插件 -> 配 provider -> 创建 Claude 会话 -> 发送消息”这条主路径

也就是说，第一版不是追求把所有 capability 全做透，而是先把产品入口和默认路径收敛住。

## LiteLLM 使用方式

在 NextClaw 里，LiteLLM 路径的使用方式建议直接写成产品标准流程：

1. 部署一个 LiteLLM 服务
2. 确保它对 Claude 暴露 `Anthropic Messages API`
3. 在 `Providers` 中新增 provider：
   - 名称示例：`litellm-claude`
   - `apiBase`: LiteLLM 地址
   - `apiKey`: LiteLLM key
4. 在该 provider 下维护想要暴露给 Claude 的模型列表
5. 在聊天页创建 `Claude` 会话
6. 选择或自动带出 `litellm-claude/<model>`
7. Claude runtime 会读取该 provider 的 `apiBase/apiKey/model`，经现有运行时环境变量桥接到 Claude SDK

这条路径与当前代码结构是兼容的，因为现有 Claude runtime 已支持：

- 读取 provider 级 `apiKey`
- 读取 provider 级 `apiBase`
- 把它们映射到 `ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL`
- 对模型名做 provider 前缀剥离后传入 Claude SDK

## 最终结论

在 `NextClaw` 的产品语境里，Claude 的正确设计不是：

- “它只属于 Claude 自家模型”
- 也不是“它天然吃所有模型”

而是：

- `preferred_model` 继续是统一产品真相
- `claude` 继续是统一会话体系下的一个 runtime
- 由 Claude runtime 在当前配置下运行时探测自己真实支持的模型
- 前端与服务端只消费探测结果，不做拍脑袋规则

这套设计既保住了 `NextClaw` 的统一产品心智，也尊重了 Claude SDK 的真实能力边界。

## 参考资料

- Anthropic Agent SDK TypeScript: <https://docs.claude.com/en/docs/agent-sdk/typescript>
- Claude Code SDK overview: <https://docs.claude.com/en/docs/claude-code/sdk/sdk-overview>
- Claude Code Bedrock / Vertex / proxies: <https://docs.claude.com/en/docs/claude-code/bedrock-vertex-proxies>
- Claude Code LLM gateway: <https://docs.claude.com/en/docs/claude-code/llm-gateway>
- LiteLLM: <https://docs.litellm.ai/>
- LiteLLM repository: <https://github.com/BerriAI/litellm>
- NextClaw Claude runtime plugin: [`packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/index.ts`](../../packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/index.ts)
- NextClaw Codex runtime plugin: [`packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.ts`](../../packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.ts)
