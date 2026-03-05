# v0.0.1-skills-resource-hub

## 迭代完成说明（改了什么）

按“先一点一点加”的要求，本次仅做一个最小范围改动：

1. 将资源页聚焦到「自带 skill 已提到的 skills 仓库」。
2. 中英文资源页均改为 phase 1 版本，暂不混入其它泛资源。
3. 仓库清单来源限定在：
   - `packages/nextclaw-core/src/agent/skills/nextclaw-skill-resource-hub/references/source-map.md`
   - `packages/nextclaw-core/src/agent/skills/README.md`

已整理仓库：

- https://github.com/Peiiii/nextclaw
- https://github.com/openclaw/skills
- https://github.com/openclaw/openclaw
- https://github.com/openai/skills
- https://github.com/VoltAgent/awesome-openclaw-skills

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

1. `resources` 页面只出现 skills 仓库，不再混入其它分类。
2. 中英文页面内容结构一致。

## 发布/部署方式

仅 docs 改动，无后端/数据库迁移。

1. 本地验证通过后执行：`pnpm deploy:docs`
2. 发布后抽样访问：
   - `/zh/guide/resources`
   - `/en/guide/resources`

## 用户/产品视角的验收步骤

1. 打开中文资源页，确认标题与说明明确为“phase 1：skills 仓库汇总”。
2. 检查仓库列表仅包含 skills 相关来源。
3. 切换英文资源页，确认同样是同一批仓库与同一结构。
