# NextClaw Agent Home Directory and Identity Design

## 实现状态

2026-04-05 已进入落地实现阶段，并补充了更贴近代码执行顺序的实现收束文档：

- [2026-04-05-multi-agent-implementation-plan](2026-04-05-multi-agent-implementation-plan.md)

当前实现收口到下面这条 v1 主链：

- 保留现有 `workspace` 结构，只明确其产品语义为 `Agent Home Directory`
- `main` 作为内建 Agent 存在，不通过创建流程生成
- `nextclaw agents new/list/remove` 成为正式 CLI 主链
- UI 新增 `Agents` 管理页
- 聊天草稿态支持 Agent 选择
- 会话列表与聊天头部展示轻量 Agent 身份
- avatar v1 使用本地优先策略：
  - 显式远程 URL 继续直连
  - 显式本地文件复制到 Agent Home Directory 后写成 `home://...`
  - 未显式提供时自动生成本地 `avatar.svg`
  - UI 仍保留 deterministic 字母头像 fallback，用于历史数据或缺失场景

## 目标

在不改造现有多会话、多并行、跨会话通信主链的前提下，正式定义 NextClaw 现有 `agents.list[*].workspace` 的产品语义：

- 它不是一个临时“工作目录”
- 它本质上就是这个 Agent 的 `Agent Home Directory`

本设计当前聚焦三件事：

- 明确 `workspace` 的正式语义
- 明确它与 `project_root` 的边界
- 明确多 Agent 面向产品体验的最小身份模型与落地主链

本设计不解决：

- 重做目录结构
- 新增一套 `agents/<id>/...` 根目录
- 引入迁移
- 重做 session / spawn / routing / parallel execution 基础设施

## 设计判断

当前方案其实已经具备多 Agent 的关键基础：

- 每个 Agent 本来就可以配置自己的 `workspace`
- 每个 Agent 的 `workspace` 本来就可以放自己的设定、记忆、技能
- 系统已经支持会话隔离与并行执行

所以本轮不需要再发明一套新的 Agent 存储结构。长期最优不是“重做一层”，而是：

- 承认现有方案已经成立
- 把语义讲清楚
- 把默认行为做得更简单、更可预测

## 正式定义

### `workspace` 的正式语义

配置字段继续叫 `workspace`，保持兼容。

但从产品语义上，统一定义为：

- `Agent Home Directory`

UI 上可使用更短的名称：

- `Agent Home`

### 与 `project_root` 的边界

两个概念必须彻底区分：

- `Agent Home Directory`：这个 Agent 长期生活的地方
- `project_root`：这个 Agent 当前正在处理的项目现场

前者表达“这个 Agent 是谁”，后者表达“它此刻在做什么项目”。

## Agent Home Directory 的核心内容

Agent Home Directory 的核心资产只强调以下内容：

- `SOUL.md`
- `USER.md`
- `IDENTITY.md`
- `MEMORY.md`
- `memory/`
- `skills/`

这几个内容分别承载：

- `SOUL.md`：人格、价值观、风格
- `USER.md`：这个 Agent 对用户的长期理解
- `IDENTITY.md`：自我定义
- `MEMORY.md` 与 `memory/`：长期记忆与持续积累
- `skills/`：专长与能力扩展

这里要注意一件事：

- “核心内容”不等于“初始化时只允许创建这些文件”

本设计强调的是 Agent Home Directory 的语义核心，而不是要求这次顺手重做初始化模板集合。

## 默认行为原则

这一轮设计必须坚持一个原则：

- 默认逻辑强
- 分支尽量少
- 行为可预测

同时还要坚持：

- 产品入口优先
- 配置入口退居后台

因此，Agent Home Directory 的行为应按下面的原则定义：

- 默认情况下，Agent 有自己的 Home Directory
- 默认情况下，创建 Agent 时同时完成 Home Directory 初始化
- 默认情况下，不额外弹出“要不要初始化默认文件”的选择
- 如果用户确实要改路径或做特殊配置，放到高级配置里处理

也就是说，用户面对的主路径应该是：

- 创建 Agent
- 系统自动分配并初始化它的 Home Directory

而不是：

- 创建 Agent
- 再问你要不要建目录
- 再问你要不要生成默认文件
- 再问你要不要选模板

这种分支太多，不符合 NextClaw 需要的轻量和可预测性。

## 产品入口优先，不以配置为主路径

多 Agent 不是一个“先设计配置字段，再让用户自己拼装”的能力。

长期最优的形态应该是：

- 主要能力通过产品动作直接提供
- 配置文件承担持久化与高级覆盖职责
- 用户不需要先理解底层配置模型，才能正常使用多 Agent

因此，这一轮设计的立场是：

- “新增 Agent”首先应该是产品动作
- “Agent Home Directory”首先应该是产品概念
- `config.json` 继续作为现有真相源与底层存储
- 但不应把“手动改配置”当成用户主路径

换句话说：

- 产品层负责提供清晰、直接、可预测的操作入口
- 配置层负责承接这些操作的持久化结果

如果以后需要暴露自定义能力，例如：

- 自定义 Home Directory 路径
- 特殊 runtime / model / engine 设定

这些都应该优先放进高级配置，而不是让基础使用流程建立在配置之上。

## 是否复用现有模板机制

可以，而且应该优先复用。

当前 NextClaw 已经有现成的 workspace 初始化能力：

- `nextclaw init`
- `WorkspaceManager.createWorkspaceTemplates(...)`

它当前的行为特征是：

- 创建缺失文件
- 不覆盖已有文件
- 自动补齐 `skills/`
- 自动补齐 `memory/`

这和本轮需要的“默认初始化 Agent Home Directory”是同一类能力。

因此，本轮的长期最优方向不是再做一套新的 Agent 模板机制，而是：

- 直接复用现有 workspace template 初始化链路
- 把它的语义解释为“初始化 Agent Home Directory”

## 当前结构的语义化理解

当前用户安装的默认结构大致可以理解为：

```text
~/.nextclaw/
├── config.json
└── workspace/                  # 默认 agent 的 Agent Home Directory
```

在多 Agent 配置下，可以自然扩展为：

```text
~/.nextclaw/
├── config.json
└── workspace/                  # main agent home

~/workspace-engineer/           # engineer agent home
~/workspace-designer/           # designer agent home
~/workspace-researcher/         # researcher agent home
```

也就是说，旧方案并不是没有 per-agent home，而是：

- 每个 Agent 的 home 由它自己的 `workspace` 配置决定
- 只是之前在产品语义上没有把这件事讲清楚

## 新增 Agent 的最小设计

如果以后补产品化的“新增 Agent”动作，最小设计应当是：

1. 新建一条 agent 配置
2. 为它确定一个默认的 Home Directory 路径
3. 直接复用现有模板初始化这个目录
4. 将路径写回现有 `config.json`

这里要强调：

- 这四步是产品动作在内部完成的事情
- 不是要求用户自己去编辑 `config.json`

这里不需要：

- 新增 `profile.json`
- 设计第二份真相源
- 额外引入“是否初始化”的选择分支

如需更复杂的路径定制，放入高级配置即可。

## 产品入口设计

这一轮如果继续往前走，重点不应该是再讨论配置字段，而是把多 Agent 做成真正的产品能力。

推荐采用三层入口：

- 聊天页主入口
- 设置页全量管理入口
- CLI / Tool 底层动作入口

### 1. 聊天页主入口

这是用户最自然的地方，因为用户真正感知到 Agent 的地方就是聊天。

推荐形态：

- Agent 与会话绑定
- Agent 选择发生在“新会话草稿态”
- 在草稿态引导区提供 Agent 选择入口
- 继续保留 `Create Agent` 动作入口

这里需要明确一个关键原则：

- 不建议让一个已经存在的会话在中途随意切换 Agent

更合理的模型是：

- 每个会话从创建开始就绑定一个 Agent
- 默认绑定主 Agent
- 用户在“准备发起一个新会话，但还没真正提交第一条消息”时，可以修改这次新会话将绑定的 Agent

也就是说：

- 点击“新会话”时，前端先进入草稿态
- 这时候还没有真正创建后台 session
- 用户可以在草稿态引导内容下方选择这次新会话要绑定的 Agent
- 第一条消息真正发送出去时，后台才创建该会话，并把选定 Agent 一起固化进去

这样用户可以在一个地方完成四件事：

- 看见当前有哪些 Agent
- 为新会话选择要绑定的 Agent
- 直接创建一个新的 Agent
- 开始与该 Agent 的独立会话

这比“先建会话，再在会话里切 Agent”更稳定，也更符合心智模型。

### 2. 设置页全量管理入口

现有 `Routing & Runtime` 页面已经有 `Agent List` 编辑能力。

这块不需要推翻，但它的定位应该调整为：

- 高级管理入口
- 不是主入口

它更适合承载：

- workspace / Agent Home Directory 路径覆盖
- model / engine 覆盖
- bindings
- 其它运行时高级选项

也就是说，设置页不负责日常选 Agent，而负责：

- 聊天页负责“新会话选 Agent、日常使用、快速创建”
- 设置页负责“深入配置”

### 3. CLI / Tool 底层动作入口

为了让产品动作、自动化、以及未来的 agent-to-agent 自主创建能力共用同一套机制，应该补一个正式的底层动作入口。

推荐方向：

- `nextclaw agents list`
- `nextclaw agents new <agent-id>`
- `nextclaw agents remove <agent-id>`

其中 `new` 的默认行为应当直接完成：

- 生成 agent 配置
- 分配默认 Home Directory
- 初始化 Home Directory 模板
- 写回 `config.json`

这样做的意义不是让普通用户去背 CLI，而是：

- 让产品 UI 有一个清晰的底层能力可调用
- 让自动化流程有稳定入口
- 让未来 AI 自己创建 Agent 时，不需要直接编辑配置文件

## AI 自主创建 Agent

长期看，NextClaw 应该支持：

- 用户直接对当前 Agent 说“帮我创建一个 researcher agent”

但这个能力不应该通过“让 Agent 自己修改配置文件”来实现。

更合理的路径是：

- Agent 调用一个明确的产品动作或系统工具
- 该动作内部复用 `agents new`
- 最终由统一的 Agent 创建流程完成目录初始化与配置写入

这样有几个好处：

- 行为更可预测
- 不会出现每个 Agent 各自拼装配置的分叉
- UI、CLI、Agent Tool 走的是同一条主链

也就是说，长期最优不是：

- UI 一套创建逻辑
- CLI 一套创建逻辑
- Agent 再偷偷手改配置来创建

而是：

- 底层只有一套 Agent 创建动作
- UI / CLI / Agent Tool 都调用它

## Agent Identity 最小模型

如果目标包含：

- 会话列表像聊天软件一样，一眼看出“当前在和谁对话”
- 未来支持多 Agent 群聊
- 未来支持在群聊里清晰地区分不同 Agent

那么只设计 `agent id` 是不够的。

本设计建议补齐一个最小但完整的 Agent Identity：

- `id`
- `displayName`
- `avatar`

### 1. `id`

`id` 是系统身份。

它负责：

- 配置中的唯一标识
- runtime 路由
- bindings
- session 归属
- CLI / tool 调用

要求：

- 稳定
- 唯一
- 不面向普通用户直接作为主展示信息

### 2. `displayName`

`displayName` 是展示身份。

它负责：

- 会话列表展示
- 当前聊天头部展示
- Agent 切换器展示
- 未来群聊消息头展示

要求：

- 面向用户
- 可读
- 允许与 `id` 不同

### 3. `avatar`

`avatar` 也是最小必要的一部分，而不是装饰。

它负责：

- 会话列表快速识别
- 群聊消息中快速区分发言者
- Agent 切换器与 `@` 选择器中的视觉识别

要求：

- v1 就应支持
- 没有传入时允许系统生成默认头像

### `avatar` 的数据模型

这里不建议把头像拆成多份字段，也不建议直接把图片内容塞进配置。

v1 建议只保留一个字段：

- `avatar: string`

但它的语义不是“任意文本”，而是：

- `avatarRef`
- 即一个头像资源 URI

也就是说：

- 配置层存的是“头像来源”
- UI 层拿到的是“可渲染的头像 URL 或 fallback”

### v1 建议支持的头像来源

为了保证体验和可实现性，v1 只建议支持两类来源：

1. 远程 URL
2. Agent Home Directory 内的本地图片

对应到 `avatarRef` 的格式：

- `https://...`
- `http://...`
- `home://<relative-path>`

例如：

```text
https://example.com/avatars/researcher.png
home://avatar.png
home://images/profile.webp
```

### 为什么推荐 `home://`

如果头像是 Agent 自己的一部分，那么最自然的本地归属就是：

- 放在 Agent Home Directory 里

用 `home://` 的好处是：

- 语义清楚
- 与 Agent Home Directory 概念一致
- 不把本机绝对路径直接暴露给 UI
- 未来迁移 Home Directory 时，头像也天然跟着走

### 为什么不建议直接用 `file://`

不建议把 `file://` 作为配置层主格式。

原因：

- 浏览器侧不应直接依赖本机文件路径
- `file://` 对远程访问、Web UI、权限边界都不稳定
- 绝对路径可移植性差

因此更合适的方式是：

- 配置里用 `home://...`
- 服务端负责把它解析成真正可访问的头像内容 URL

### 默认本地头像路径

为了减少分支，系统生成或导入本地头像时，推荐采用一个固定默认位置：

- `home://avatar.<ext>`

例如：

```text
home://avatar.png
home://avatar.webp
```

如果用户明确指定了 Agent Home Directory 内的其它相对路径，也可以支持：

- `home://images/avatar.png`

但系统默认写入应尽量统一，不要每次随机决定目录结构。

### 不建议 v1 支持的形式

为了避免过度设计，v1 不建议支持：

- `data:image/...`
- 多尺寸头像字段
- 独立头像元数据对象
- 多来源优先级链

也就是说，v1 只要解决：

- 远程 URL
- Home Directory 本地图片
- 没有头像时的默认生成

就够了。

### UI 渲染模型

这里建议把“配置存储格式”和“浏览器渲染格式”分开。

配置里：

- `avatar`

服务端 / API 视图里：

- `avatar`
- `avatarUrl`

其中：

- `avatar` 保留原始 `avatarRef`
- `avatarUrl` 是浏览器真正使用的可访问地址

解析规则建议是：

- `http://` / `https://`
  - `avatarUrl = avatar`
- `home://...`
  - 服务端解析相对路径
  - 通过 NextClaw 自己的 HTTP 接口输出图片内容
  - `avatarUrl = /api/agents/:agentId/avatar`

这样前端完全不需要理解本地路径细节。

### 没有头像时怎么办

如果没有显式头像，不建议把“必须上传图片”变成创建门槛。

更好的默认行为是：

- 自动生成一个 fallback avatar

推荐方式：

- 基于 `agentId` 或 `displayName` 生成字母头像或 identicon

这样做有几个好处：

- 创建零阻力
- 会话列表不会出现大片空白
- 与 GitHub 这类产品的默认 identicon 逻辑一致

### 为什么只保留这三个字段

为了支撑高质量体验，最小必要是：

- `id`
- `displayName`
- `avatar`

但本轮仍然不做：

- `mentionAliases`
- 独立 `profile.json`
- 更重的 profile 系统

因为这些已经超出当前最小必要范围。

## `agents new` 的命令设计

推荐主命令：

```bash
nextclaw agents new <agent-id>
```

推荐可选参数：

- `--name <display-name>`
- `--avatar <avatar>`
- `--home <path>`

### 必要参数

当前只建议一个必要参数：

- `<agent-id>`

原因：

- 它是系统唯一稳定标识
- 其它字段都应该有默认逻辑

### UI 轻量，CLI 完整

这里需要明确一条很重要的分层原则：

- UI 主路径可以轻量
- CLI 创建能力必须完整

原因：

- 普通用户在 UI 中不应该被大量高级选项淹没
- 但 AI、自自动化脚本、以及高级用户，需要一个完整且稳定的创建入口
- 只有 CLI 足够完整，AI 才能真正可靠地“自己创建 Agent”

所以 `nextclaw agents new` 不应该只是一个极简 demo 命令，而应该是一条完整主链。

### CLI 应支持的完整自定义能力

除了最小主路径外，CLI 应支持完整覆盖 Agent 创建所需的关键能力。

建议分成两层：

- 常用参数
- 高级参数

#### 常用参数

- `--name <display-name>`
- `--avatar <avatar>`

#### 高级参数

- `--home <path>`

这里要强调：

- CLI 要完整，但不等于把所有运行时内部字段都暴露出来
- 创建 Agent 所需的“完整”，指的是身份与 home 相关能力完整
- 不应把一堆未来理想上本就该被弱化甚至消失的字段继续外露

原则是：

- UI 不一定全部露出
- CLI 应完整覆盖“创建 Agent”这个动作本身
- CLI 不应继续放大 `contextTokens`、`maxToolIterations` 这类过重的内部参数感知

### 为什么 CLI 要完整

因为未来存在一个明确场景：

- 用户直接对当前 AI 说：“帮我创建一个新的 Agent”

这时 AI 最可靠的做法不应该是：

- 手写 `config.json`
- 猜测目录结构
- 手动拼模板文件

而应该是：

- 调用一条完整的官方 CLI 命令

也就是说：

- CLI 是产品动作的自动化接口
- 不是只给人手输的“专家工具”

### `--avatar` 的输入规则

为了让人和 AI 都容易操作，`nextclaw agents new --avatar` 建议支持这两类输入：

1. 远程 URL
2. 本地文件路径

也就是说，命令行层可以接受：

```bash
nextclaw agents new researcher --avatar https://example.com/a.png
nextclaw agents new researcher --avatar ./researcher.png
nextclaw agents new researcher --avatar /tmp/researcher.png
```

但需要注意：

- CLI 接受本地文件路径
- 不等于配置最终写入本地绝对路径

推荐标准化行为：

- 如果输入是远程 URL
  - 直接写入 `avatar = https://...`
- 如果输入是本地文件路径
  - 复制到 Agent Home Directory
  - 写入标准化后的 `avatar = home://avatar.<ext>`

这样做的好处是：

- 人和 AI 都更容易调用命令
- 配置最终仍然保持统一语义
- 不会把临时本地路径污染进配置

## AI 通过自管理能力创建 Agent

NextClaw 已经有内置自管理 skill：

- `nextclaw-self-manage`

它当前通过：

- `USAGE.md`

来学习和执行 NextClaw 自管理操作。

因此，多 Agent 创建真正闭环需要满足两件事：

1. `nextclaw agents new ...` 成为正式且稳定的产品 CLI
2. `USAGE.md` 与 `nextclaw-self-manage` 能明确覆盖这条命令

这样未来 AI 才能稳定完成下面这类任务：

- “帮我创建一个 research agent”
- “帮我创建一个 designer agent，模型用 xxx，home 放到 xxx”

### 对 AI 侧的要求

AI 不应：

- 直接编辑 `config.json`
- 直接手工创建 Home Directory 文件
- 绕过正式命令主链

AI 应：

- 优先调用 `nextclaw agents new`
- 必要时补充高级参数
- 创建后再做状态确认

### 对文档与 skill 的要求

当 `agents new` 落地后，需要同步补齐：

- `docs/USAGE.md`
- `packages/nextclaw-core/src/agent/skills/nextclaw-self-manage/SKILL.md`

其中 `USAGE.md` 应作为正式操作说明，至少覆盖：

- `nextclaw agents list`
- `nextclaw agents new`
- `nextclaw agents remove`
- 常用参数
- 高级参数
- 成功与失败示例

而 `nextclaw-self-manage` 需要明确把 Agent 管理纳入可操作范围。

### main Agent 约束

这里需要明确：

- 默认 Agent 就是主 Agent，也就是 `main`
- `main` 是系统内建 Agent
- 不通过 `nextclaw agents new` 创建
- v1 不支持在创建时指定“设为默认 Agent”

也就是说：

- `nextclaw agents new` 只负责创建新的附加 Agent
- 不负责重定义“默认 Agent”这件事

### 默认行为

执行 `nextclaw agents new engineer` 时，默认应完成：

1. 校验 `agent-id`
2. 检查是否已存在同名 agent
3. 生成默认 `displayName`
4. 生成默认 `avatar`
5. 生成默认 Home Directory
6. 初始化 Home Directory 模板
7. 写回 `config.json`

也就是说：

- `new` 是完整动作
- 不是只追加一段配置

### 默认值策略

为了保持低摩擦和可预测：

- 没传 `--name`
  - 从 `agent-id` 自动推导默认 `displayName`
- 没传 `--avatar`
  - 生成默认头像
- 没传 `--home`
  - 按默认路径规则生成 Agent Home Directory

对于模型与引擎，这里不设计 per-agent 创建参数。

当前原则是：

- 新 Agent 默认继承系统已有的默认模型与默认引擎配置
- 不在 `agents new` 上暴露 `--model` / `--engine`
- 也不暴露 `contextTokens` / `maxToolIterations` 等更底层参数

### 默认 Home Directory 规则

推荐使用简单且可预测的同级规则：

- 以 `agents.defaults.workspace` 为基准
- 生成 sibling 路径：`<default-workspace>-<agent-id>`

例如：

```text
~/.nextclaw/workspace
~/.nextclaw/workspace-engineer
~/.nextclaw/workspace-researcher
```

### 失败策略

为了保证可预测性：

- `agent-id` 已存在：直接失败
- 目标 Home Directory 已存在且非空：直接失败
- 不隐式覆盖
- 不自动改名
- 不偷偷 merge

## 面向会话列表与群聊的产品补充

如果目标是聊天软件级体验，那么 Agent Identity 不能只存在于配置页。

至少需要进入这些界面：

- 会话列表
- 当前聊天头部
- Agent 切换器
- 未来群聊消息流

## 轻量产品形态建议

为了保持体验好，但又不过度设计，当前建议采用“轻量优先”的产品形态。

### 1. 新会话草稿态选 Agent

推荐交互：

- 点击“新会话”
- 前端进入空白草稿态
- 在当前草稿态引导区下方增加一个 Agent 选择入口

这个 Agent 选择器的职责非常明确：

- 它只决定“接下来这个新会话将由哪个 Agent 负责”
- 它不是用来切换一个已存在会话的绑定关系
- 它只在草稿态显示

这里有一个重要约束：

- 不建议把 Agent 选择器放在聊天框底部

原因：

- 聊天框底部天然会被理解为“发送前随时可切换的当前会话设置”
- 这会让用户误以为进入正式会话后仍然可以中途改绑 Agent
- 这与“Agent 绑定会话”的模型冲突

因此更合适的位置是：

- 只在草稿态可见
- 放在欢迎文案/引导区下方
- 作为“开始这次新会话前的选择项”

默认行为：

- 默认选中 main / 默认 Agent
- 用户手动改成其它 Agent 后，本次新会话按新 Agent 创建

### 2. 侧边导航增加 Agent 管理页

当前侧边导航已经有：

- 定时任务
- Skills

所以继续增加一个独立的 `Agents` 管理页是合理的。

它的定位应该是：

- 一个产品层的 Agent 管理入口
- 不是底层配置 JSON 编辑页

这个页面适合做：

- 查看所有 Agent
- 创建 Agent
- 删除 Agent
- 查看基础身份信息
- 跳转到高级配置

而不适合直接承载：

- 全量 runtime 配置细节
- bindings 细节
- 大量底层配置项

也就是说：

- `Agents` 页面是产品管理入口
- `Routing & Runtime` 页面仍然是高级配置页

### 3. 会话列表做轻量 Agent 标识

会话列表确实应该体现“当前是和哪个 Agent 对话”，但我同意现在不必直接做成重型微信式头像主导布局。

v1 建议采用更轻的方式：

- 保持当前会话列表主布局不大改
- 每条会话项增加轻量 Agent 标识

推荐优先级：

- 先加一个小头像或字母头像
- 再加一个简短 `displayName`
- 或者至少加一个清晰的 Agent badge

目标是做到：

- 一眼能区分会话归属
- 不显著增加列表视觉负担

不建议 v1 直接做：

- 微信式重头像主导布局
- 群聊九宫格头像
- 很重的多层信息密度设计

### 4. 为未来群聊预留，但不提前做重

未来如果真做群聊，再逐步升级视觉表达：

- 群聊会话列表再考虑九宫格头像
- 群聊消息流再做更强的发言者分层

但现在先把基础打对：

- 会话绑定 Agent
- Agent Identity 统一
- 列表能识别是谁

这已经足够支撑下一阶段演进。

## 具体交互规格

下面给出面向 v1 的具体交互规格。

目标：

- 先把单 Agent / 多 Agent 会话体验做清楚
- 先保证新会话选 Agent 的心智稳定
- 先保证会话列表能识别“正在和谁对话”
- 不提前引入群聊重交互

### 1. 新会话草稿态规格

#### 进入方式

- 用户点击侧边栏 `新会话`
- 前端进入空白草稿态
- 此时不立即创建后台 session

#### 页面状态

草稿态页面由三部分组成：

- 欢迎文案 / 引导区
- Agent 选择区
- 输入框

推荐顺序：

1. 欢迎文案
2. Agent 选择区
3. 输入框

#### Agent 选择区的位置

Agent 选择区放在：

- 草稿态欢迎文案或引导内容的下方
- 输入框的上方

不放在：

- 聊天框底部操作条
- 已创建会话的消息流头部

#### Agent 选择区的展示结构

v1 建议使用轻量卡片式选择器，而不是下拉框优先。

每个 Agent 项展示：

- 小头像
- `displayName`
- 次级 `id`
- 可选的一行简短状态信息

推荐视觉结构：

```text
[ avatar ]  Researcher
            researcher
```

当前选中项：

- 边框高亮
- 背景轻微强调
- 右上角或右侧有选中态标记

#### 默认行为

- 默认选中 main / 默认 Agent
- 若用户刚创建了一个新 Agent，可在本次草稿态中立即切过去
- 若没有任何自定义 Agent，则只显示默认 Agent

#### 提交行为

- 用户发送第一条消息时
- 前端携带当前草稿态选中的 `agentId`
- 后台创建新会话
- 会话一旦创建，该 `agentId` 固化

#### 离开草稿态后的行为

- 正式会话开始后，不再显示 Agent 选择区
- 后续只能继续与该 Agent 对话
- 若要换 Agent，必须新建会话

### 2. `Agents` 管理页规格

#### 入口位置

侧边导航新增一个与现有入口同级的项目：

- `Agents`

它与下面这些入口同级：

- 定时任务
- Skills

#### 页面职责

`Agents` 页是产品管理页，不是高级配置页。

它负责：

- 查看全部 Agent
- 创建 Agent
- 删除 Agent
- 查看基础身份信息
- 查看基础状态
- 跳转到高级配置

它不负责：

- 直接编辑 bindings
- 直接编辑复杂 runtime 配置
- 承载大量底层设置表单

#### 页面结构

推荐页面由三块组成：

1. 顶部说明区
2. Agent 列表区
3. 创建动作区

#### 顶部说明区

说明区应非常简短，只回答一件事：

- Agent 是什么

推荐文案方向：

- 每个 Agent 都有自己的 Home Directory、设定、记忆和技能。

#### Agent 列表区

每个 Agent 以一张轻量卡片展示。

卡片展示信息：

- 头像
- `displayName`
- `id`
- 是否为内建 `main`
- Home Directory 简短路径

卡片动作：

- `New Chat`
- `Open Settings`
- `Delete`

其中：

- `New Chat` 直接进入一个绑定该 Agent 的新会话草稿态
- `Open Settings` 跳到 `Routing & Runtime` 或对应高级设置区域
- `Delete` 需要二次确认

#### 创建动作区

页面顶部右侧或列表上方提供：

- `Create Agent`

点击后打开一个轻量创建面板或弹窗。

v1 创建表单建议只有这些字段：

- `Agent ID`
- `Display Name`
- `Avatar`
- `Home Directory`

#### 创建流程

用户点击 `Create Agent` 后：

1. 填基础字段
2. 提交
3. 调用统一创建动作
4. 创建成功后刷新 Agent 列表
5. 可选提供 `Start Chat` 快捷动作

### 3. 会话列表规格

#### 设计目标

让用户一眼知道：

- 这个会话是在和哪个 Agent 对话

但同时保持当前列表轻量，不做重型改版。

#### v1 展示方式

保持当前会话列表主信息结构不变：

- 标题
- 最新时间
- 其它已有辅助信息

只新增一层轻量 Agent 标识。

推荐方案：

- 在标题行前放一个小头像
- 在标题或副标题区域补一个简短 `displayName`

备选轻量方案：

- 在会话标题右侧补一个 Agent badge

#### 推荐优先级

优先推荐：

1. 小头像
2. `displayName`
3. 需要时再补 badge

原因：

- 头像识别速度最快
- 名字语义最直接
- badge 适合作为补充，不适合作为唯一标识

#### 会话项信息结构

推荐结构：

```text
[avatar]  会话标题
          Agent: Researcher
```

如果列表空间较紧，可压缩为：

```text
[avatar] 会话标题   [Researcher]
```

#### 特殊状态

如果是默认主 Agent：

- 不需要额外强调“main”
- 只展示它自己的名字和头像

如果 Agent 已被删除但历史会话还在：

- 会话仍保留原 `agentDisplayName`
- 同时标记为 `Unavailable` 或 `Deleted`

### 4. 当前聊天头部规格

进入正式会话后，聊天头部应展示当前绑定的 Agent 身份。

最小展示：

- 小头像
- `displayName`

作用：

- 强化“这个会话当前是和谁对话”
- 避免用户误解还能中途切 Agent

不建议在这里放：

- Agent 切换器

因为头部展示的是归属，不是切换动作。

### 5. 空状态与异常状态

#### 没有自定义 Agent

- 草稿态选择区仍显示默认 Agent
- `Agents` 页正常展示默认 Agent
- 不额外提示“你还没有 Agent”

#### 创建失败

创建失败时应明确给出原因：

- `Agent ID already exists`
- `Home Directory is not empty`
- `Invalid agent id`
- `main is reserved`

同时保留当前表单输入，不要清空。

#### Agent 被删除

若用户删除某个 Agent：

- 不影响历史会话记录显示
- 新会话不再允许选择该 Agent
- 已有会话继续只读展示其历史身份信息

### 6. v1 明确不做的交互

为了保持方案轻量，v1 不做：

- 正式会话中途切换 Agent
- 聊天框底部的 Agent 选择器
- 群聊九宫格头像
- 多 Agent 群聊发言编排
- 复杂拖拽排序
- 多层 Agent 分组管理

### 会话列表需要什么

当前会话列表的核心问题是：

- UI 会话项还没有显式的 Agent 身份字段
- 现阶段部分链路仍在通过 session key 推断 agent

这不适合长期演进。

因此，实践上应补齐会话视图层的 Agent Identity：

- `agentId`
- `agentDisplayName`
- `agentAvatar`

这样会话列表才能真正做到：

- 一眼看出“当前在和谁聊天”
- 不依赖 session key 的字符串猜测

### 群聊需要什么

未来群聊能力最少也要复用同一套 Agent Identity：

- 消息头展示 `displayName`
- 消息侧展示 `avatar`
- `@` 选择面板使用 `displayName + avatar + id`

这里的关键不是提前把群聊系统做完，而是：

- 现在就避免把 Agent 设计成只有内部 `id`

## 具体实践方案

下面给出一版最小但可落地的实践方案。

### Phase 1: 补齐数据模型

目标：

- 让 `agents.list[*]` 具备最小 Agent Identity

改动点：

- `packages/nextclaw-core/src/config/schema.ts`
  - 在 `AgentProfileSchema` 增加：
    - `displayName?: string`
    - `avatar?: string`
- `packages/nextclaw-server/src/ui/types.ts`
  - `AgentProfileView` 增加同名字段
- `packages/nextclaw-ui/src/api/types.ts`
  - `AgentProfileView` 增加同名字段

原则：

- 不新增第二份真相源
- 继续以 `config.json -> agents.list` 作为单一真相源

补充说明：

- `avatar` 存的是 `avatarRef`
- 不直接存图片内容
- 不直接存本地绝对路径作为标准格式

### Phase 2: 实现统一创建动作

目标：

- 建立唯一的 Agent 创建主链

建议动作：

- 实现 `nextclaw agents new <agent-id>`
- 内部复用现有 `WorkspaceManager.createWorkspaceTemplates(...)`

动作结果：

- 校验 id
- 生成 `displayName`
- 生成 `avatar`
- 分配 Home Directory
- 初始化模板
- 写入 `config.json`
- 支持高级参数覆盖

原则：

- UI 不自己拼配置
- Agent Tool 不自己写配置
- 所有入口都调用同一创建动作

补充要求：

- CLI 要支持完整自定义参数
- 后续 AI 调用也必须走这条主链

头像相关要求：

- `--avatar <http-url>`：直接写入远程 URL
- `--avatar <local-file-path>`：复制到 Agent Home Directory，并写入 `home://avatar.<ext>`

### Phase 3: 把 Agent 身份带入会话列表

目标：

- 让会话列表具备聊天产品级识别能力

改动点：

- `packages/nextclaw-server/src/ui/types.ts`
  - `SessionEntryView` 增加：
    - `agentId?: string`
    - `agentDisplayName?: string`
    - `agentAvatar?: string`
    - `agentAvatarUrl?: string`
- `packages/nextclaw-ui/src/api/types.ts`
  - 同步增加以上字段
- `packages/nextclaw-server/src/ui/session-list-metadata.ts`
  - 读取或组装 session 侧的 agent identity
- `packages/nextclaw-server/src/ui/config.ts`
  - 在 `listSessions(...)` 中返回这些字段
- `packages/nextclaw-ui/src/components/chat/*`
  - 会话列表项展示 `avatar + displayName`

原则：

- 不继续依赖 session key 猜 agent
- 显式返回 Agent 身份信息

### Phase 3.5: 头像解析链路

目标：

- 让浏览器能稳定渲染 Agent 头像

改动点：

- `packages/nextclaw-server/src/ui/types.ts`
  - `AgentProfileView` 增加：
    - `avatarUrl?: string`
- `packages/nextclaw-ui/src/api/types.ts`
  - 同步增加：
    - `avatarUrl?: string`
- 服务端新增 Agent avatar 解析逻辑
- 服务端新增 Agent avatar 内容路由

建议解析规则：

- `http://` / `https://`
  - 直接作为 `avatarUrl`
- `home://...`
  - 解析到 Agent Home Directory 内的实际文件
  - 通过 NextClaw 自己的 HTTP 路由输出图片内容

原则：

- 前端只用 `avatarUrl`
- 前端不直接读取本地路径
- `home://` 必须做相对路径校验，禁止逃逸出 Agent Home Directory

### Phase 4: 新会话草稿态 Agent 选择

目标：

- 让 Agent 选择发生在正确的位置

改动方向：

- 聊天页“新会话”进入草稿态
- 草稿态下在引导区增加 Agent 选择入口
- 正式进入会话后不再展示该入口
- 发送第一条消息时再真正创建后台会话
- 创建时固化 `agentId`

原则：

- Agent 绑定会话
- 不在已存在会话中途随意切换 Agent

### Phase 5: 调整产品入口

目标：

- 把“新增 Agent”和“切换 Agent”从配置思维升级为产品动作

改动方向：

- 侧边导航增加 `Agents` 管理页
- `Agents` 页提供查看、创建、删除等产品动作
- 聊天页保留轻量 Agent 选择，不承载重管理
- `Routing & Runtime` 保留为高级配置页

原则：

- 聊天页负责新会话选择与日常使用
- `Agents` 页负责产品层管理
- 设置页负责高级管理

### Phase 6: 为未来群聊预留统一身份层

目标：

- 不重复造第二套发言者身份模型

要求：

- 群聊消息展示直接复用：
  - `agentId`
  - `agentDisplayName`
  - `agentAvatar`

原则：

- 单一身份模型贯穿配置、会话列表、聊天头部、群聊消息

### Phase 7: 接入自管理说明链路

目标：

- 让 AI 真正学会如何用官方方式创建 Agent

改动点：

- `docs/USAGE.md`
  - 新增 `agents list/new/remove` 使用说明
- `packages/nextclaw-core/src/agent/skills/nextclaw-self-manage/SKILL.md`
  - 将 Agent 管理纳入自管理能力范围

原则：

- 文档是真实命令的说明，不发明额外路径
- AI 自管理与人工 CLI 使用共用同一套 source of truth

### Phase 8: 头像体验收口

目标：

- 把头像从“可配置”变成“真正可用”

改动点：

- `docs/USAGE.md`
  - 补充 `--avatar` 的远程 URL / 本地文件示例
- `Agents` 创建页
  - 支持输入 URL 或上传本地图片
- 草稿态 Agent 选择区
  - 展示头像或 fallback avatar
- 会话列表
  - 展示头像或 fallback avatar

原则：

- 没有头像时必须有稳定 fallback
- 不让“上传头像”成为创建门槛

## 参考 OpenClaw 的地方

OpenClaw 有两个点值得借鉴：

- 提供了明确的 `agents` CLI 入口
- 提供了控制台里的 Agent 配置入口

这说明多 Agent 不应该只停留在配置文件层，而应该有正式产品入口。

但 NextClaw 与 OpenClaw 也不完全一样。

NextClaw 当前已经有：

- 聊天页
- 多 session 运行时
- `selectedAgentId` 这样的前端运行态

所以 NextClaw 更适合的产品化路径不是把能力只放在配置后台，而是：

- 让聊天页承担“Agent 使用与创建”的主入口
- 让设置页承担“高级配置与路由管理”的后台入口
- 让 CLI / Tool 成为统一底层动作层

## 本轮不做的事

为了避免过度设计，本轮明确不做：

- 调整 `sessions` 存放位置
- 扩展 per-agent heartbeat 机制
- 新增展示层文件
- 重新定义 session metadata
- 重做上下文装配协议

## 结论

本轮最重要的结论只有四个：

- 保留旧方案，不新造目录体系
- 正式把 `workspace` 解释为 `Agent Home Directory`
- 用 `id + displayName + avatar` 作为最小 Agent Identity
- 未来新增 Agent 时，默认直接初始化 Home Directory，并复用现有模板链路

这样做的好处是：

- 不迁移
- 不分叉
- 不新增真相源
- 不额外增加理解成本
- 同时保留长期演进空间
