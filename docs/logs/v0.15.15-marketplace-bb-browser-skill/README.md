# v0.15.15-marketplace-bb-browser-skill

## 迭代完成说明

- 新增 `skills/bb-browser` marketplace skill，slug 为 `bb-browser`。
- 将上游 `epiral/bb-browser` 适配为 NextClaw 可上架版本，采用“包装外部运行时而不是搬运整个上游仓库”的接入方式。
- 新增 NextClaw 化 `SKILL.md`，明确：
  - 本地 `bb-browser` CLI 安装边界
  - daemon 路径与 `--openclaw` 路径的执行区别
  - 浏览器 / 登录态 / daemon 就绪检查
  - site adapter、`fetch`、浏览器自动化三类工作流
  - 写操作必须显式确认的安全边界
- 新增 `marketplace.json`，补齐中英文 summary / description、标签、来源仓库与主页信息。
- 新增 `UPSTREAM_LICENSE`，保留上游 MIT License。
- 已通过项目 CLI 将该 skill 发布到 NextClaw marketplace，并完成远端查询与安装冒烟闭环。

## 测试 / 验证 / 验收方式

- 本地 metadata 校验：

```bash
python3 .agents/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/bb-browser
```

- marketplace 首次上架：

```bash
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js skills publish skills/bb-browser --meta skills/bb-browser/marketplace.json --api-base https://marketplace-api.nextclaw.io
```

- marketplace 远端校验：

```bash
curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/bb-browser
```

观察点：
- 返回 `ok: true`
- `summaryI18n.en` / `summaryI18n.zh` 存在
- `descriptionI18n.en` / `descriptionI18n.zh` 存在
- `install.kind = marketplace`

- marketplace 安装冒烟（非仓库目录）：

```bash
tmp_dir=$(mktemp -d /tmp/nextclaw-marketplace-skill.XXXXXX)
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js skills install bb-browser --api-base https://marketplace-api.nextclaw.io --workdir "$tmp_dir"
find "$tmp_dir/skills/bb-browser" -maxdepth 2 -type f | sort
```

- 安装后二次 metadata 校验（非仓库目录）：

```bash
tmp_dir=$(mktemp -d /tmp/nextclaw-marketplace-skillcheck.XXXXXX)
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js skills install bb-browser --api-base https://marketplace-api.nextclaw.io --workdir "$tmp_dir"
python3 .agents/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir "$tmp_dir/skills/bb-browser"
rm -rf "$tmp_dir"
```

- maintainability 校验：

```bash
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard
```

- `build / lint / tsc`：
  - 不适用。本次未触达 TypeScript 业务源码、构建入口或类型链路，变更集中在 marketplace skill 文档与元数据。

结果说明：
- `bb-browser` skill 已成功发布到 marketplace。
- 远端详情查询返回正常。
- 非仓库目录安装冒烟成功，安装后 skill 目录包含 `SKILL.md`、`marketplace.json`、`UPSTREAM_LICENSE`。
- `pnpm lint:maintainability:guard` 通过；仅保留两个与本次无关的历史 warning：
  - `packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/tool-card/tool-card-file-operation.tsx`
  - `packages/nextclaw-ui/src/components/chat/adapters/chat-message-part.adapter.ts`
- 曾出现一次发布后紧接着的安装请求短暂返回 `skill item not found: bb-browser`，随后复测安装成功；倾向于远端短暂一致性抖动，不构成本次集成阻塞。

## 发布 / 部署方式

- 首次上架：

```bash
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js skills publish skills/bb-browser --meta skills/bb-browser/marketplace.json --api-base https://marketplace-api.nextclaw.io
```

- 当前发布结果：
  - marketplace slug：`bb-browser`
  - 安装命令：`nextclaw skills install bb-browser`
  - 远端查询：`https://marketplace-api.nextclaw.io/api/v1/skills/items/bb-browser`

## 用户 / 产品视角的验收步骤

1. 在任意 NextClaw workspace 或项目目录执行：

```bash
nextclaw skills install bb-browser
```

2. 进入实际使用场景后，让 AI 执行一个只读检查，例如：
   - 检查本机是否已安装 `bb-browser`
   - 检查 daemon / Chrome 是否已就绪
   - 查看有哪些 site adapters 可用

3. 验收点：
   - AI 会先区分 marketplace skill 安装和上游 `bb-browser` CLI 安装，不会把两者混为一谈
   - AI 会优先做 `command -v bb-browser`、`bb-browser --version`、`bb-browser status --json` 这类就绪检查
   - 若用户明确走 OpenClaw 路径，AI 会要求所有 site 命令携带 `--openclaw`

4. 让 AI 继续执行一个只读真实任务，例如：
   - `bb-browser site list`
   - `bb-browser site info reddit/thread`
   - `bb-browser fetch <url> --json`

5. 验收点：
   - 环境未就绪时，AI 会诚实停下并指出缺失项
   - 适配器缺失时，AI 会引导 `site list / site search / site update`
   - 涉及发帖、删除、提交表单、购买、修改设置等高风险动作时，AI 会先征求显式确认

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。采用最小必要接入，只新增 `skills/bb-browser` 三个文件和一份迭代记录，没有把上游仓库、脚本或额外运行时复制进本仓库。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。方案上优先选择“包装外部工具 skill”而不是引入新的 product/runtime 层逻辑，也没有为了看起来更完整而增加本地安装器或兼容胶水。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：基本是。文件数有最小必要净增，但仅限单个新 skill 目录与迭代日志，属于新增 marketplace 能力的直接载体，没有扩张到业务源码目录，也没有增加新的运行链路分支。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。职责边界保持清楚：
  - marketplace skill 负责安装说明、就绪检查、工作流选择与风险披露
  - 上游 `bb-browser` CLI 负责真实执行
  - 用户浏览器与登录态负责站点访问权限
- 目录结构与文件组织是否满足当前项目治理要求：是。新增内容收敛在 `skills/bb-browser/`，未把 skill 元数据散落到其它目录；迭代记录按 `docs/logs/v0.15.15-marketplace-bb-browser-skill/README.md` 落位。
- 若本次迭代不涉及代码可维护性评估，必须明确写“不适用”并说明理由：不适用。本次未触达业务源码或架构实现层，不涉及 class / service / store 的代码内部分拆，但已对 marketplace skill 的边界、文件最小化与目录归位做了可维护性约束。
