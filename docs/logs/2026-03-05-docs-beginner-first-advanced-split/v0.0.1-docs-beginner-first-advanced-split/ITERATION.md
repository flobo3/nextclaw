# v0.0.1-docs-beginner-first-advanced-split

## 迭代完成说明（改了什么）

本次将文档站改为“新手默认路径”，并把高级内容下沉到进阶模块：

1. 导航与侧栏重组（中英一致）：
   - 主线：`开始使用 -> 功能 -> 学习与资源 -> 参考与排错 -> 进阶 -> 项目`
   - 将“资源”与“教程”归并到同一主线。
   - 将“多 Agent 路由”从功能区移到进阶区。
2. 配置页改为新手 UI 路径（中英）：
   - 删除默认对配置文件的前置要求。
   - 保留连接测试失败的实用排障。
   - 新增进阶入口跳转。
3. 新增进阶页面（中英）：
   - `apps/docs/zh/guide/advanced.md`
   - `apps/docs/en/guide/advanced.md`
   - 承载配置文件、Secrets refs、热更新范围、上下文预算、工作区模板、多 Agent 说明。
4. 介绍页去掉多 Agent 叙述（中英）：
   - 重新改写为新手价值与推荐阅读顺序。
5. 首页 feature 去掉“多 Agent”卡片（中英）：
   - 替换为“新手友好/Beginner-Friendly”。

## 测试/验证/验收方式

执行命令：

1. `pnpm build`
2. `pnpm lint`
3. `pnpm tsc`
4. `pnpm --filter @nextclaw/docs build`

本地结果：

1. `build` 通过。
2. `lint` 通过（仅仓库既有 warning，无新增 error）。
3. `tsc` 通过。
4. docs 构建通过。

## 发布/部署方式

本次仅 docs 变更，无数据库与后端迁移。

1. 完成本地验证后执行：`pnpm deploy:docs`
2. 线上冒烟检查：
   - 顶栏是否显示新结构
   - `配置` 是否为新手 UI 路径
   - `进阶配置` 页面是否可访问

## 用户/产品视角的验收步骤

1. 打开 `https://docs.nextclaw.io/zh/`，确认首页不再强调多 Agent。
2. 进入 `https://docs.nextclaw.io/zh/guide/introduction`，确认介绍页不提多 Agent，先引导新手路径。
3. 进入 `https://docs.nextclaw.io/zh/guide/configuration`，确认默认内容是 UI 配置流程，不要求先改配置文件。
4. 进入 `https://docs.nextclaw.io/zh/guide/advanced`，确认高级能力集中在进阶模块。
5. 检查侧栏：`多 Agent 路由` 位于“进阶”组，而非“功能”组。
