# v0.0.1-after-setup-openclaw-community

## 迭代完成说明（改了什么）

本次仅针对“配置后做什么”页面补充外部参考，聚焦 OpenClaw 教程与社区分享：

1. 在中文页面新增章节：
   - 官方教程（Getting Started / Wizard / Showcase / FAQ）
   - 社区分享（awesome usecases 英文/中文、GitHub Discussions）
   - 基于资料提炼的 3 条执行建议
2. 英文页面同步同样结构与链接。
3. 明确标注这些建议是“基于资料提炼/inferred”，避免与官方原文混淆。

修改文件：

- `apps/docs/zh/guide/after-setup.md`
- `apps/docs/en/guide/after-setup.md`

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

1. `after-setup` 页面出现“OpenClaw 教程/建议/分享”章节。
2. 中英文页面链接项一致。
3. 官方与社区来源区分明确。

## 发布/部署方式

仅 docs 改动，无后端/数据库迁移。

1. 本地验证通过后执行：`pnpm deploy:docs`
2. 发布后检查：
   - `/zh/guide/after-setup`
   - `/en/guide/after-setup`

## 用户/产品视角的验收步骤

1. 打开 `配置后做什么` 页面，确认能直接看到官方教程与社区分享入口。
2. 随机点击 2-3 个链接，确认可访问。
3. 阅读“提炼建议”，确认是可执行动作而非泛描述。
