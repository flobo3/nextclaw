# Project-First Session List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不引入独立 Project 实体的前提下，为聊天左侧边栏补一个轻量的 `project-first` 视图切换，并支持在 project 分组内直接新建会话。

**Architecture:** 继续坚持“session 是主语，project 只是 `session.metadata.project_root` 的派生上下文”。不新增第二套 sidebar、路由或存储模型，只在现有 session list store 上增加一个轻量 `listMode`，再基于同一份 session summaries 派生出 `time-first` 与 `project-first` 两种投影视图。`project-first` 视图仅展示绑定了 project 的 session，并在 project 组头触发带 `pendingProjectRoot` 的新建会话。

**Tech Stack:** TypeScript, React, Zustand, existing NextClaw chat sidebar, Vitest, Testing Library

---

## 长期目标对齐 / 可维护性推进

- 这次改动是在强化 NextClaw 作为统一入口的体验，而不是新增一块平行功能区：用户仍然只面对一个会话入口，但能按“时间”或“项目”两种心智模型组织工作。
- 明确不新增 `Project` 实体、不新增 `projects` 存储、不新增第二个 sidebar 组件树，避免把“派生视图问题”误做成“数据模型扩张问题”。
- 优先通过现有 session store、现有 session summaries、现有 create-session 流程扩展最小字段和最小派生函数，尽量把复杂度限制在 UI 投影层。
- 若出现净增代码，必须集中在“视图模式状态”“project 分组派生”“组头新建动作”这三处最小必要点，并同步复用现有 session item 渲染，避免复制列表 UI。

## 范围边界

本次要做：

- 左侧 sidebar 顶部增加一个很轻量的二选一列表模式切换。
- 保留当前按时间分组的会话列表视图。
- 新增 `project-first` 树状列表：
  - 一级：project
  - 二级：该 project 下的 sessions
- `project-first` 视图下隐藏未绑定 project 的 sessions。
- project 组头提供“在该 project 下新建会话”的入口。
- 搜索继续复用现有 query 机制。

本次不做：

- 独立 `Project` 数据模型或服务端 project API
- project 折叠状态持久化
- 未绑定 project 的 “Other / No project” 分组
- 额外筛选器、排序器、拖拽或多层树结构

## Task 1: 扩展 sidebar 列表模式状态

**Files:**
- Modify: `packages/nextclaw-ui/src/components/chat/stores/chat-session-list.store.ts`
- Modify: `packages/nextclaw-ui/src/components/chat/managers/chat-session-list.manager.ts`
- Test: `packages/nextclaw-ui/src/components/chat/managers/chat-session-list.manager.test.ts`

**Step 1: 写失败测试**

- 为 store/manager 增加 `listMode` 的断言。
- 为 manager 增加切换 mode 的行为测试。
- 为 `createSession` 增加可选 `projectRoot` 参数的测试。

**Step 2: 实现最小状态扩展**

- 在 `ChatSessionListSnapshot` 中新增 `listMode: "time-first" | "project-first"`。
- 为 `ChatSessionListManager` 新增 `setListMode`。
- 扩展 `createSession(sessionType?, projectRoot?)`，让 project 组头可直接复用现有 draft 创建链路。

**Step 3: 跑针对性测试**

- 运行 manager 相关测试，确认状态变更和 project 内新建参数都正确落库。

## Task 2: 基于现有 session 数据派生 project-first 视图

**Files:**
- Modify: `packages/nextclaw-ui/src/components/chat/ncp/use-ncp-session-list-view.ts`
- Possibly Modify: `packages/nextclaw-ui/src/components/chat/chat-session-display.ts`
- Test: `packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx`

**Step 1: 先补视图派生测试**

- 为 `project-first` 视图覆盖：
  - 只显示有 project 的 sessions
  - 同 project 内按更新时间排序
  - project 名称作为组头展示

**Step 2: 实现最小派生结构**

- 保留当前 `items` 输出，新增适合 sidebar 消费的 project group 派生数据。
- 继续复用现有 query 过滤与 child-session 过滤规则。
- project 分组键使用 `projectRoot`，展示名使用 `projectName`。

**Step 3: 复核复杂度**

- 确认没有把“分组派生”写成第二套 session adapter 或第二套 sidebar item 结构。

## Task 3: 改造 sidebar 组件为双视图投影

**Files:**
- Modify: `packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx`
- Reuse: `packages/nextclaw-ui/src/components/chat/chat-sidebar-session-item.tsx`
- Test: `packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx`
- Modify: `packages/nextclaw-ui/src/lib/i18n.chat.ts`

**Step 1: 先补 UI 测试**

- 测试轻量切换控件能在两种视图间切换。
- 测试 `project-first` 视图下不会显示无 project 的 session。
- 测试 project 组头的新建按钮会带着该 projectRoot 调用 `createSession`。

**Step 2: 实现轻量视图切换**

- 在搜索框附近加入极轻量的文本/胶囊式切换控件。
- 默认仍然是现有时间视图，避免改动现有用户路径。

**Step 3: 实现 project 分组渲染**

- 渲染 project 组头和组内 session 列表。
- 继续复用现有 session item，避免重复维护样式和交互。

**Step 4: 实现 project 内新建会话**

- project 组头点击后，调用 `createSession(defaultSessionType, projectRoot)`。
- 保持右侧会话类型下拉的现有能力不变；本次不把 project 透传进下拉菜单，先走最小闭环。

## Task 4: 验证、维护性复核与文档留痕

**Files:**
- Modify: `docs/logs/<recent-related-iteration>/README.md` 或新增更高版本迭代目录

**Step 1: 执行最小充分验证**

- 运行受影响测试。
- 若组件行为有用户可见变化，补一条最小冒烟验证思路。

**Step 2: 做一次独立维护性复核**

- 检查是否做成了“一个 store 字段 + 一个派生视图 + 复用现有 item”的最小方案。
- 检查是否存在可以继续删除的重复分支或重复 JSX。

**Step 3: 依据 docs/logs 规则收尾**

- 若属于最近 project/session 迭代的同批次续改，则更新该迭代 README。
- 若已跨出原批次，再创建新迭代目录并补齐五段式 README。
