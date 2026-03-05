# v0.0.1-post-setup-resource-hub

## 迭代完成说明（改了什么）

本次围绕“用户配置完后不知道做什么”的问题，新增了文档站的“配置后”信息架构：

1. 新增中英文页面：
   - `apps/docs/zh/guide/after-setup.md`
   - `apps/docs/en/guide/after-setup.md`
   - `apps/docs/zh/guide/resources.md`
   - `apps/docs/en/guide/resources.md`
2. 更新文档站导航与侧栏（中英）：
   - `apps/docs/.vitepress/config.ts`
   - 新增 `After Setup / 配置后` 栏目入口。
   - 后续按用户视角重排为一致的信息架构：`开始使用 -> 功能 -> 学习与资源 -> 参考与排错 -> 项目`，并将“资源”并入“教程/学习”主线。
3. 在快速开始页补“配置后做什么 + 资源导航”入口（中英）：
   - `apps/docs/zh/guide/getting-started.md`
   - `apps/docs/en/guide/getting-started.md`
4. 在配置页底部补“配置完成后的下一步”入口（中英）：
   - `apps/docs/zh/guide/configuration.md`
   - `apps/docs/en/guide/configuration.md`

资源页聚合内容以 OpenClaw 生态为主，覆盖官方入口、生态工具、社区案例、awesome/项目列表。

## 测试/验证/验收方式

执行以下验证：

1. 全项目构建：`pnpm build`
2. 全项目静态检查：`pnpm lint`
3. TypeScript 检查：`pnpm tsc`
4. 文档站构建冒烟：`pnpm --filter @nextclaw/docs build`

验收观察点：

1. 文档站导航重排为 `开始使用 -> 功能 -> 学习与资源 -> 参考与排错 -> 项目`（中英一致）。
2. 快速开始与配置页均出现新入口。
3. `after-setup` 与 `resources` 页面中英文可正常访问，外链可点击。

## 发布/部署方式

本次为文档站改动，无数据库或后端迁移。

按 docs 发布流程执行：

1. 本地完成上述验证。
2. 执行文档部署命令（项目既有流程）：`pnpm deploy:docs`
3. 发布后访问线上文档页面做一次冒烟回归。

## 用户/产品视角的验收步骤

1. 打开 `https://docs.nextclaw.io/zh/guide/getting-started`，确认“下一步”中包含“配置后做什么 / 生态资源”。
2. 进入 `https://docs.nextclaw.io/zh/guide/after-setup`，确认有明确的 5 步行动建议。
3. 进入 `https://docs.nextclaw.io/zh/guide/resources`，确认能看到官方入口、项目案例和 awesome 列表。
4. 切换英文站，确认 `after-setup` 与 `resources` 页面对应存在且内容对齐。
5. 从“配置”页底部进入新页面，确认用户路径形成闭环（配置 -> 下一步行动 -> 资源借鉴）。
