# 迭代完成说明

- 为 marketplace 的 `git` skill 安装增加 **无 git 自动兜底**。
- 当前安装策略改为：
  - 若本机存在 `git`，优先使用 `git clone --depth 1 --filter=blob:none --sparse` + `sparse-checkout` 走最快路径。
  - 若本机不存在 `git`，自动切换到 GitHub HTTP 下载：通过 GitHub contents API 递归拉取目标 skill 目录文件，再落到 NextClaw 工作区 `skills/<skill>`。
- 继续保持此前约束：**只安装到 NextClaw 自己的 `skills/` 目录，不写 `.agents/skills/`**。
- 新增回归测试覆盖无 git fallback。

# 测试/验证/验收方式

- 单测：`pnpm -C packages/nextclaw test -- --run src/cli/commands/service.marketplace-skill.test.ts`
- 构建：`pnpm -C packages/nextclaw build`
- Lint：`pnpm -C packages/nextclaw lint`
  - 结果：无 error；仅保留既有 `max-lines` / `max-lines-per-function` warning。
- 类型检查：`pnpm -C packages/nextclaw tsc`
- 无 git 冒烟（隔离目录，未写仓库）：
  - 使用 `/tmp/nextclaw-ui-skill-http-smoke-*` 作为 `NEXTCLAW_HOME` 与 workspace
  - 进程内显式清空 `PATH`，确保检测不到 `git`
  - 通过 UI router 的 `POST /api/marketplace/skills/install` 安装 `anthropics/skills/skills/pdf`
  - 观察点：
    - HTTP 状态为 `200`
    - 返回 `ok: true`
    - 返回消息为 `Installed skill: pdf`
    - 输出包含 `Git fast path unavailable: git executable not found`
    - 输出包含 `Installer path: github-http`
    - `/tmp/.../workspace/skills/pdf/SKILL.md` 存在
    - `/tmp/.../workspace/.agents/skills/pdf/SKILL.md` 不存在

# 发布/部署方式

- 本次仅完成本地代码修复与验证，未执行发布。
- 如需发布，按项目既有发布流程对 `packages/nextclaw` 做版本变更与发布。
- 远程 migration：不适用（无后端/数据库变更）。
- 线上 API 冒烟：不适用（本次未发布线上服务）。

# 用户/产品视角的验收步骤

- 在未安装 `git` 的 Windows 机器启动本地 `nextclaw` UI。
- 打开 marketplace 的 Skills 页面。
- 找到 `pdf` 等 `git` 来源 skill，点击“安装”。
- 预期结果：
  - 不再出现 `git is required to install marketplace git skills` 报错。
  - 安装成功提示正常出现。
  - 对应 skill 出现在已安装列表。
  - 工作区仅生成 `skills/<skill>`，不生成 `.agents/skills/<skill>`。
