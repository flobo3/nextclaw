# v0.0.1-skills-repo-only-update

## 迭代完成说明（改了什么）

根据最新要求，资源页进一步收敛并修正为：

1. 仅保留 skills 相关仓库，不再保留项目主仓库。
2. 增加官方 skills 仓库：
   - `anthropics/skills`
   - `vercel-labs/agent-skills`
   - `openai/skills`
   - `openclaw/skills`
3. 增加你指定的聚合仓库：
   - `awesome-openclaw-usecases`
4. 增加高赞 agent skills 集合仓库：
   - `ComposioHQ/awesome-claude-skills`
   - `sickn33/antigravity-awesome-skills`
   - 其中 `ComposioHQ/awesome-claude-skills` 标注为当前检索到星标最高的 agent skills 集合仓库。
5. 中英文资源页结构保持一致。

## 测试/验证/验收方式

执行：

1. `pnpm build`
2. `pnpm lint`
3. `pnpm tsc`
4. `pnpm --filter @nextclaw/docs build`

本地结果：

1. `build` 通过。
2. `lint` 通过（仅仓库既有 warning，无新增 error）。
3. `tsc` 通过。
4. docs 构建通过。

验收点：

1. `resources` 页面仅含 skills 仓库及 skills/usecases 聚合。
2. 中英文页面链接项一致。
3. 指定仓库均已包含。

## 发布/部署方式

仅 docs 改动，无后端/数据库迁移。

1. 本地验证通过后执行：`pnpm deploy:docs`
2. 发布后检查：
   - `/zh/guide/resources`
   - `/en/guide/resources`

## 用户/产品视角的验收步骤

1. 打开资源页，确认不再出现 nextclaw/openclaw 主仓库。
2. 确认存在 Anthropic / Vercel / OpenAI / OpenClaw 四个 skills 仓库。
3. 确认存在 `awesome-openclaw-usecases`。
4. 确认存在高赞 agent skills 集合仓库。
