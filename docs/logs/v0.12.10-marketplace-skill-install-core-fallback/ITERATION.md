# 迭代完成说明

- 修复 `nextclaw` UI 中 marketplace skill 点击安装时，`git` 类型 skill 报错 `The "path" argument must be of type string or an instance of Buffer or URL. Received undefined` 的问题。
- 根因定位：UI 请求体本身正常；问题出在 `packages/nextclaw/src/cli/commands/service.ts` 内部通过 `npx skild install ...` 调用 `skild` CLI 包装层安装 `git` skill 时，`skild@0.13.1` CLI 路径解析链路会抛出上述 `path` 为 `undefined` 的异常；而直接调用 `@skild/core` 的 `installSkill` 能正常完成安装。
- 修复方案：将 marketplace 的 `git` skill 安装链路从 `skild` CLI 切换为 `@skild/core` 子进程调用，并保留安装结果到工作区 `skills/<name>` 的镜像复制逻辑。
- 兼容增强：当工作区 `.agents/skills/<name>` 已存在而 `skills/<name>` 缺失时，不再重复安装，直接补拷贝到 NextClaw 工作区 skill 目录。
- 新增回归测试：覆盖“已存在 `.agents` 安装目录时的补拷贝”和“`@skild/core` 子进程返回 installDir 后镜像到工作区”的两条路径。

# 测试/验证/验收方式

- 单测：`pnpm -C packages/nextclaw test -- --run src/cli/commands/service.marketplace-skill.test.ts`
- 构建：`pnpm -C packages/nextclaw build`
- Lint：`pnpm -C packages/nextclaw lint`
  - 结果：通过；存在历史 `max-lines`/`max-lines-per-function` warning，仅涉及既有长文件，不影响本次修复。
- 类型检查：`pnpm -C packages/nextclaw tsc`
- 冒烟（隔离目录，未写仓库）：
  - 使用 `/tmp/nextclaw-ui-skill-smoke-*` 作为 `NEXTCLAW_HOME` 与 workspace
  - 通过 UI router 的 `POST /api/marketplace/skills/install` 安装 `anthropics/skills/skills/pdf`
  - 观察点：
    - HTTP 状态为 `200`
    - 返回 `ok: true`
    - 返回消息为 `Installed skill: pdf`
    - `/tmp/.../workspace/.agents/skills/pdf/SKILL.md` 存在
    - `/tmp/.../workspace/skills/pdf/SKILL.md` 存在

# 发布/部署方式

- 本次为本地代码修复与验证，未执行发布。
- 如需发布，按项目既有 NPM/构建流程执行对应包版本变更与发布；本次仅影响 `packages/nextclaw`。
- 远程 migration：不适用（无后端/数据库变更）。
- 线上 API 冒烟：不适用（本次未发布线上服务）。

# 用户/产品视角的验收步骤

- 启动本地 `nextclaw` UI。
- 进入 marketplace 的 Skills 页面。
- 找到 `pdf` 这类 `git` 来源 skill，点击“安装”。
- 预期结果：
  - 不再出现 `path argument ... Received undefined` 报错。
  - 页面提示安装成功。
  - 该 skill 出现在已安装列表中。
  - 工作区下同时存在 `.agents/skills/<skill>` 与 `skills/<skill>` 对应文件夹（供底层安装与 NextClaw skill loader 使用）。
