# NextClaw 飞书能力可见性缺口分析

## 背景

这份文档记录一次围绕以下问题的排查结论：

- NextClaw 的飞书插件是否已经集成了 `docs / wiki / 多维表格(bitables)` 等能力
- 如果已经集成，为什么用户在 NextClaw 中“不容易看到”，以及为什么模型经常“不知道自己可以这样用”
- 相比 `larksuite/openclaw-lark` 上游插件，NextClaw 目前还缺哪些关键闭环

用户原始关注点不是“有没有源码”，而是：

`这些能力在产品里到底怎么被 AI 真正用起来，以及为什么现在体验上像没接好一样。`

## 结论先行

结论很明确：

1. NextClaw 当前仓库里，飞书 `doc / wiki / drive / bitable` 能力已经存在于代码层。
2. 问题不在“完全没集成”，而在“没有形成模型可感知、用户可理解、文档可发现的完整闭环”。
3. 当前最关键的断点不是 API 能力缺失，而是：
   - 插件自带 `skills` 没有进入 NextClaw 的技能发现链路
   - 飞书工作面能力没有被充分注入到模型提示中
   - `bitable` 缺少对应的技能说明文件
   - 用户文档对这些能力几乎没有显式展开

换句话说，当前状态更接近：

`能力已经接入，但 AI 和用户都没有被清楚地告知“这里能做什么、应该怎么做”。`

## 当前代码现状

### 已注册的飞书能力

飞书插件入口已经显式注册以下能力：

- `registerFeishuDocTools`
- `registerFeishuChatTools`
- `registerFeishuWikiTools`
- `registerFeishuDriveTools`
- `registerFeishuPermTools`
- `registerFeishuBitableTools`

对应代码：

- `packages/extensions/nextclaw-channel-plugin-feishu/index.ts`

这说明从插件注册层看，NextClaw 并不只有消息通道，已经把飞书工作面能力接了进来。

### 默认启用状态

默认工具配置如下：

- `doc: true`
- `chat: true`
- `wiki: true`
- `drive: true`
- `perm: false`
- `scopes: true`

对应代码：

- `packages/extensions/nextclaw-channel-plugin-feishu/src/tools-config.ts`

这意味着只要飞书账号配置正确，`doc/wiki/drive` 默认本来就应该是可用的。

### 具体能力覆盖

#### 文档

`feishu_doc` 已支持：

- `read`
- `write`
- `append`
- `insert`
- `create`
- `list_blocks`
- `get_block`
- `update_block`
- `delete_block`
- `create_table`
- `write_table_cells`
- `create_table_with_values`
- `insert_table_row`
- `insert_table_column`
- `delete_table_rows`
- `delete_table_columns`
- `merge_table_cells`
- `upload_image`
- `upload_file`
- `color_text`

对应代码：

- `packages/extensions/nextclaw-channel-plugin-feishu/src/docx.ts`

#### Wiki

`feishu_wiki` 已支持：

- `spaces`
- `nodes`
- `get`
- `create`
- `move`
- `rename`

对应代码：

- `packages/extensions/nextclaw-channel-plugin-feishu/src/wiki.ts`

#### 多维表格

已注册的 bitable 工具包括：

- `feishu_bitable_get_meta`
- `feishu_bitable_list_fields`
- `feishu_bitable_list_records`
- `feishu_bitable_get_record`
- `feishu_bitable_create_record`
- `feishu_bitable_update_record`
- `feishu_bitable_create_app`
- `feishu_bitable_create_field`

对应代码：

- `packages/extensions/nextclaw-channel-plugin-feishu/src/bitable.ts`

#### 云盘 / 权限

已具备：

- `feishu_drive`
- `feishu_perm`

对应代码：

- `packages/extensions/nextclaw-channel-plugin-feishu/src/drive.ts`
- `packages/extensions/nextclaw-channel-plugin-feishu/src/perm.ts`

## 在 NextClaw 里“本来应该如何使用”

如果能力链路完整，用户在 NextClaw 里本来应该可以直接这样用：

- “读取这个飞书文档并总结第三节”
- “找到这个 wiki 页面对应的对象并帮我改标题”
- “解析这个 bitable 链接，列出字段，再查最近 20 条记录”
- “往这个多维表格新增一条记录”
- “在飞书文档中插入一个表格并写入数据”

也就是说，正确体验不应该是“手动打开某个隐藏入口”，而应该是：

`用户直接用自然语言发任务，模型知道有飞书工具可用，并主动走正确的飞书工作流。`

## 为什么现在 AI 经常不知道

这是本次排查最关键的结论。

### 根因 1：插件 skills 没进入 NextClaw 的技能发现链路

飞书插件 manifest 已声明：

- `skills: ["./skills"]`

对应文件：

- `packages/extensions/nextclaw-channel-plugin-feishu/openclaw.plugin.json`

但 NextClaw 当前的 `SkillsLoader` 只扫描两类目录：

- 工作区 `skills/`
- core 内建 `skills/`

对应代码：

- `packages/nextclaw-core/src/agent/skills.ts`

它并不会扫描插件目录里的 `skills/`。这意味着：

- 飞书插件虽然自带了 `feishu-doc / feishu-drive / feishu-wiki / feishu-perm`
- 但这些技能默认不会出现在模型可见的 `<available_skills>` 里
- 模型也不会自然去读这些 `SKILL.md`

这会直接导致：

`工具存在，但模型缺少“什么时候该用、该怎么用”的高价值操作说明。`

### 根因 2：bitable 有工具实现，但没有对应 skill

当前插件目录下存在的飞书技能只有：

- `feishu-doc`
- `feishu-drive`
- `feishu-perm`
- `feishu-wiki`

目录：

- `packages/extensions/nextclaw-channel-plugin-feishu/skills`

其中没有 `feishu-bitable`。这意味着：

- 多维表格源码已经接入
- 但没有一份专门教模型如何完成 bitable 工作流的技能说明

这会让模型更容易停留在“知道有工具名，但不知道最佳调用顺序”的状态。

### 根因 3：飞书 agent prompt hints 太薄

当前飞书通道注入给模型的提示只包含：

- 如何回复当前飞书会话
- 飞书支持 interactive card

对应代码：

- `packages/extensions/nextclaw-channel-plugin-feishu/src/channel.ts`

但它没有告诉模型：

- 飞书还支持 doc/wiki/drive/bitable 工作面
- 什么时候优先用 `feishu_wiki + feishu_doc` 组合
- 遇到 `/wiki/` 或 `/base/` 链接时应该先做什么

所以即使工具已注册，模型仍然很可能只把飞书理解成“聊天渠道”，而不是“工作面入口”。

### 根因 4：公开文档没有把能力讲清楚

当前飞书教程页基本只是一个外链跳转：

- `apps/docs/zh/guide/tutorials/feishu.md`
- `apps/docs/en/guide/tutorials/feishu.md`

这会造成两个问题：

1. 用户侧看不到明确的能力清单
2. 团队内部也缺少一份清晰的“产品级能力定义”

结果就是：

`代码里有，产品上像没有；工具能跑，体验上像没接。`

## 与上游 openclaw-lark 的差异

参考仓库：

- <https://github.com/larksuite/openclaw-lark>

本次对比后的核心判断：

上游做得更好的地方，不只是“工具更多”，而是它把飞书能力做成了更完整的“模型可执行知识”。

### 上游的强项

#### 1. 更重的 skill 化封装

上游不仅有工具，还有更强的技能说明，直接教模型：

- 何时触发某类能力
- 应该先调用哪个工具
- 常见限制和坑点是什么
- 不同工作流的正确顺序是什么

典型参考：

- `skills/feishu-update-doc/SKILL.md`
- `skills/feishu-bitable/SKILL.md`

#### 2. 工作流导向，而不只是 API 导向

上游不是只暴露“某几个工具名”，而是把能力组织成模型更容易理解的工作任务，例如：

- 更新文档
- 操作 bitable
- 处理文档结构

这种组织方式比“给模型一堆裸 API”更容易成功。

#### 3. 能力版图更完整

从现有规划和实现对比看，上游除了 doc/wiki/drive/bitable，还覆盖了更多工作面或相关基础设施，例如：

- OAuth / token / scope 相关能力
- task / calendar 等工作面
- 更完整的 OpenClaw skill / tool 使用链路

## NextClaw 当前最真实的问题定义

当前不应把问题定义为：

`飞书 docs / bitable 还没接入。`

更准确的问题定义应该是：

`飞书工作面能力已经部分接入，但没有完成“模型知道 + 用户看见 + 文档说明 + 工作流引导”这条最后一公里。`

这是一个典型的“能力可用性暴露不足”问题，而不是单纯的“功能缺失”问题。

## 推荐改进方向

### P0：打通插件 skills 到模型的可见链路

这是最关键的一步。

目标：

- 让插件 manifest 里声明的 `skills` 能被 NextClaw 技能发现机制扫描到
- 让这些 skill 出现在模型的 `<available_skills>` 中
- 让模型在飞书相关任务上能读到对应 `SKILL.md`

如果这一步不做，后续继续补工具，模型侧感知仍然会偏弱。

### P0：补 `feishu-bitable` skill

因为 bitable 是当前最明显的“已有工具、无 skill”的缺口。

建议 skill 至少覆盖：

- URL 解析入口
- `/wiki/` 与 `/base/` 两种链接处理方式
- `get_meta -> list_fields -> list_records` 的标准调用顺序
- 创建记录 / 更新记录的字段格式要求
- 常见错误和权限问题

### P1：增强飞书 agent prompt hints

在通道级提示中明确告诉模型：

- 飞书不仅是消息渠道，也是文档 / wiki / 多维表格工作面
- 遇到 wiki 链接时优先 `feishu_wiki -> feishu_doc`
- 遇到 bitable 链接时优先 `feishu_bitable_get_meta`

这样即便模型没有主动读 skill，也更容易走对路径。

### P1：补公开产品文档

建议把飞书教程从“外链占位页”升级为明确列出：

- 支持的飞书能力范围
- 基本配置方法
- AI 中可直接发起的任务示例
- 文档 / wiki / bitable 的典型用法

这能同时解决用户理解问题和产品可发现性问题。

### P2：继续吸收上游高价值 skill / 工作流知识

优先不是继续平铺更多工具，而是继续吸收上游那些“能显著提升模型成功率”的 skill 层知识。

优先级建议：

1. `feishu-bitable`
2. `feishu-update-doc` 这类高层工作流 skill
3. 更完整的权限 / scope / OAuth 说明链路

## 产品判断

从 AgentOS 视角，这个问题非常重要。

因为飞书对 NextClaw 来说不应该只是一条消息入口，而应该是：

- 消息入口
- 文档入口
- 知识库入口
- 多维表格入口
- 工作协作入口

如果模型只能“会回飞书消息”，但不会自然使用飞书文档、wiki、bitable，那 NextClaw 就仍然停留在“聊天壳层”，而不是“工作入口”。

所以这次问题的本质，不是某个 API 有没有注册成功，而是：

`NextClaw 是否真的把飞书能力做成了 Agent 可稳定调用的产品能力。`

当前答案是：

`还没有完全做到，但已经有了相当可观的底层实现基础。`

## 建议执行顺序

建议按以下顺序推进：

1. 打通插件 skills 扫描与注入
2. 补 `feishu-bitable` skill
3. 增强飞书通道级 prompt hints
4. 补飞书公开文档
5. 继续吸收上游高价值 skill / workflow

## 本文结论摘要

一句话总结：

`NextClaw 的飞书 docs/wiki/bitable 不是“没做”，而是“做了能力层，但还没做完模型可见性和产品可用性闭环”。`

这也是后续改进的正确方向。
