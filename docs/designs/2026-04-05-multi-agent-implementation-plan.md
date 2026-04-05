# NextClaw Multi-Agent Implementation Plan

## 背景

当前多 Agent 的底座已经成立：

- 每个 Agent 已经可以绑定自己的 `workspace`
- 会话已经支持按 Agent 维度隔离
- 会话与运行态里已经存在 `selectedAgentId`

本轮不是重做基础设施，而是把“Agent 作为产品对象”正式补齐。

## 本轮目标

本轮只做最小且完整的产品闭环：

1. 补齐 Agent identity 最小模型
2. 补齐 Agent 创建 / 删除 / 列表能力
3. 补齐 Agent avatar 引用与解析链路
4. 补齐 UI 中的 Agent 管理入口
5. 补齐聊天草稿态的 Agent 选择
6. 补齐会话列表与会话头部的 Agent 标识
7. 补齐 CLI / UI / AI 自管理文档主链

## 本轮明确不做

- 不重做多会话 / 并行 / spawn 架构
- 不新增新的 `agents/<id>/...` 根目录体系
- 不引入第二份 Agent profile 真相源
- 不在 `agents new` 暴露 `model` / `engine` / `contextTokens` / `maxToolIterations`
- 不支持在已创建会话中途切换 Agent
- 不做群聊 / mention / alias 设计
- 不做复杂 avatar 平台或远程生成依赖

## 关键约束

- `workspace` 保持兼容字段名，但产品语义为 `Agent Home Directory`
- `main` 是系统内建默认 Agent，不通过 `new` 创建，也不允许删除
- 创建 Agent 时默认初始化 Home Directory，不增加分支选择
- UI 只提供轻量入口；完整创建能力走 CLI / API
- 会话绑定 Agent，Agent 选择只发生在草稿态

## 实现拆分

### 1. Shared / Core

- 扩展 `AgentProfileSchema`
  - `displayName?: string`
  - `avatar?: string`
- 新增共享 Agent 管理服务
  - list
  - create
  - remove
  - avatarRef 解析
  - `main` 保留规则
  - 默认 home path 推导
  - 本地 avatar 文件复制到 Agent Home Directory

### 2. CLI

- 新增：
  - `nextclaw agents list`
  - `nextclaw agents new <agent-id>`
  - `nextclaw agents remove <agent-id>`
- `agents new` 支持：
  - `--name`
  - `--avatar`
  - `--home`

### 3. Server

- 新增 API：
  - `GET /api/agents`
  - `POST /api/agents`
  - `DELETE /api/agents/:agentId`
  - `GET /api/agents/:agentId/avatar`
- 使用共享 Agent 管理服务，不走 shell，不调用 CLI
- 补齐 config/session view 中的 agent identity

### 4. UI

- 增加 `/agents` 页面
- 主侧边栏增加 `Agents`
- 聊天草稿态欢迎区增加 Agent 选择
- 会话列表增加轻量 Agent 标识
- 会话头部增加当前 Agent 标识

### 5. Docs

- 更新主设计文档，使其与最终实现一致
- 更新 `docs/USAGE.md`
- 更新 `nextclaw-self-manage` skill 说明

## Avatar v1 规则

- 显式 avatar 支持：
  - `http://...`
  - `https://...`
  - `home://<relative-path>`
- CLI 若传本地图片路径：
  - 自动复制到 Agent Home Directory
  - 配置中写为 `home://avatar.<ext>`
- 没有配置 avatar 时：
  - UI 使用本地 deterministic 字母头像 fallback
  - 不依赖在线头像服务

## 验证范围

- core schema / service tests
- CLI agents command tests
- server agents API tests
- avatar 安全与路径逃逸测试
- UI 关键交互测试
- 受影响包最小充分 lint / test / build
- `pnpm lint:maintainability:guard`

## 收尾要求

- 若实现过程中发现文档与代码出现偏差，优先修正文档
- 若某个切面开始膨胀，先收缩范围，不新增无关设计
- 所有结果以“主链可用、行为可预测、结构清晰”为准
