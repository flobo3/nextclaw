# NCP Phase 0 能力冻结与切换基线

## 1. 目的

本文件用于完成 `NCP 并行链路切换方案（Phase 1）` 中的 `Phase 0` 交付物之一：

- 固化 legacy 基线能力
- 固化 NCP phase 1 目标能力与非目标
- 给后续切换、验收、删旧提供统一判断标准

本文件不讨论最终实现细节，只定义本阶段必须守住的能力边界。

## 2. Legacy 基线能力（当前必须保持可用）

以下能力视为当前 NextClaw agent 主链路基线，NCP 新链路在切换前必须达到等效可用：

1. 会话主流程
   - 新建会话
   - 选择会话
   - 删除会话
   - 显示会话标题、更新时间、消息数
2. 聊天主流程
   - 发送消息
   - 接收流式回复
   - 停止当前回复
   - 渲染历史消息
   - 渲染流式中的消息状态
3. 输入区主流程
   - 草稿输入
   - slash skill 选择
   - model 选择
   - thinking level 选择
   - session type 选择与不可用提示
4. 消息展示主流程
   - markdown 文本
   - reasoning
   - tool call / tool result
   - unknown part 兜底渲染
5. 页面级行为
   - `/chat/:sessionId?` 主聊天路由可用
   - `ChatSidebar` 与聊天主面板协同工作
   - `skills` / `cron` 非聊天视图不受本次切换影响

## 3. NCP Phase 1 目标能力（切换前必须达到）

NCP 新链路第一阶段只承接 agent 核心主链路，不追求一次性覆盖所有边缘能力。

切换前必须达到：

1. 后端
   - 基于 NCP 的 `send / stream / abort`
   - 基于现有存储适配层的会话读写一致性
   - 与当前聊天页所需的 session/history/run 能力对齐
2. 前端
   - 保持 `/chat/:sessionId?` 路由与主页面结构不变
   - 在统一切换点下接入 NCP 编排链路
   - 复用 `@nextclaw/agent-chat-ui` 作为共享展示层
   - NCP 编排层输出与 legacy 对齐的展示契约
3. 用户体验
   - 发送、流式回复、停止、切会话、删会话无明显行为退化
   - UI 外观与交互保持一致
   - 切回 legacy 后无需数据迁移或人工修复

## 4. NCP Phase 1 非目标（本阶段不做）

以下内容明确不作为 phase 1 切换前提：

1. 不迁移底层存储层本体
2. 不重写所有页面或非聊天模块
3. 不要求 legacy 与 NCP 共用编排层
4. 不以支持所有历史边缘能力为切换门槛
5. 不为兼容旧实现而在共享展示层沉入 runtime/store/presenter 逻辑

## 5. 切换前判定标准

只有同时满足以下条件，才允许从 legacy 默认切到 NCP：

1. Legacy 基线能力在 NCP 链路下已全部覆盖
2. 前端共享展示层仍保持单套 UI，不存在链路分叉 UI
3. 切换开关可以在不改动数据的前提下回退到 legacy
4. 自动化验证与最小冒烟验证通过
5. 已存在旧链路删除计划，而不是默认长期双跑

## 6. 关联文档

- [NCP 并行链路切换方案（Phase 1）](./2026-03-17-ncp-parallel-chain-cutover-plan.md)
- [NCP 定位与愿景](../designs/2026-03-17-ncp-positioning-and-vision.md)
- [NCP Session-Centric Agent Backend Design](./2026-03-17-ncp-session-centric-agent-backend-design.md)
