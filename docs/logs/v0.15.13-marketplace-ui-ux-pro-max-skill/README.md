# v0.15.13-marketplace-ui-ux-pro-max-skill

## 迭代完成说明

- 新增 `skills/ui-ux-pro-max` marketplace skill，slug 为 `ui-ux-pro-max`。
- 将上游 `nextlevelbuilder/ui-ux-pro-max-skill` 适配为 NextClaw 可上架版本，采用“继承上游 skill + 本地运行资产内置”的方式集成。
- 内置上游所需的 `data/` 与 `scripts/` 运行资产，并附带 `UPSTREAM_LICENSE`，避免要求 NextClaw 用户额外安装上游 `uipro-cli`。
- 新增 NextClaw 化 `SKILL.md` 与 `marketplace.json`，明确：
  - `python3` 就绪检查
  - 只读搜索 / 设计系统生成 / 技术栈检索工作流
  - `--persist` 写入前必须显式确认
  - NextClaw marketplace 安装路径与上游独立 CLI 的边界
- 为满足仓库 maintainability 约束，将上游单个超长 `design_system.py` 拆分为生成、终端格式化、文档格式化、覆写推导、持久化等多个脚本模块，保持功能不变。
- 已通过项目 CLI 将该 skill 发布到 NextClaw marketplace，并在远端完成更新同步。

## 测试 / 验证 / 验收方式

- 本地 metadata 校验：

```bash
python3 .agents/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/ui-ux-pro-max
```

- Python 语法校验：

```bash
python3 -m py_compile skills/ui-ux-pro-max/scripts/*.py
```

- 本地功能冒烟：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "fintech dashboard accessibility" --domain ux
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -f markdown
python3 skills/ui-ux-pro-max/scripts/search.py "pricing table loading state" --stack react
```

- 本地持久化冒烟：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system --persist -p "Serenity Spa" -o .
```

- marketplace 远端校验：

```bash
curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/ui-ux-pro-max
```

观察点：
- 返回 `ok: true`
- `summaryI18n.en` / `summaryI18n.zh` 存在
- `descriptionI18n.en` / `descriptionI18n.zh` 存在
- `install.kind = marketplace`

- marketplace 安装冒烟（非仓库目录）：

```bash
tmp_dir=$(mktemp -d /tmp/nextclaw-marketplace-skill.XXXXXX)
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node packages/nextclaw/dist/cli/index.js skills install ui-ux-pro-max --api-base https://marketplace-api.nextclaw.io --workdir "$tmp_dir"
python3 "$tmp_dir/skills/ui-ux-pro-max/scripts/search.py" "beauty spa wellness" --design-system -f markdown
rm -rf "$tmp_dir"
```

- marketplace 持久化冒烟（非仓库目录）：

```bash
tmp_dir=$(mktemp -d /tmp/nextclaw-marketplace-persist.XXXXXX)
mkdir -p "$tmp_dir/project"
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node packages/nextclaw/dist/cli/index.js skills install ui-ux-pro-max --api-base https://marketplace-api.nextclaw.io --workdir "$tmp_dir/project"
python3 "$tmp_dir/project/skills/ui-ux-pro-max/scripts/search.py" "beauty spa wellness" --design-system --persist -p "Serenity Spa" -o "$tmp_dir/project"
test -f "$tmp_dir/project/design-system/serenity-spa/MASTER.md"
rm -rf "$tmp_dir"
```

- maintainability 校验：

```bash
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard
```

结果说明：
- `skills/ui-ux-pro-max` 相关问题已清零。
- 命令仍因仓库内并行改动的两个非本次文件失败：
  - `packages/nextclaw-openclaw-compat/src/plugins/runtime.ts`
  - `packages/nextclaw-server/src/ui/router/ncp-session.controller.ts`

- `build / lint / tsc`：
  - 不适用。本次未触达 TypeScript 构建链路，也未改动前端/后端业务源码编译入口。

## 发布 / 部署方式

- 首次上架：

```bash
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node packages/nextclaw/dist/cli/index.js skills publish skills/ui-ux-pro-max --meta skills/ui-ux-pro-max/marketplace.json --api-base https://marketplace-api.nextclaw.io
```

- 修正本地文件拆分后，同步更新远端：

```bash
PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node packages/nextclaw/dist/cli/index.js skills update skills/ui-ux-pro-max --meta skills/ui-ux-pro-max/marketplace.json --api-base https://marketplace-api.nextclaw.io
```

- 当前发布结果：
  - marketplace slug：`ui-ux-pro-max`
  - 安装命令：`nextclaw skills install ui-ux-pro-max`
  - 远端查询：`https://marketplace-api.nextclaw.io/api/v1/skills/items/ui-ux-pro-max`

## 用户 / 产品视角的验收步骤

1. 在任意 NextClaw workspace 或项目目录执行：

```bash
nextclaw skills install ui-ux-pro-max
```

2. 进入使用场景后，让 AI 执行只读设计查询，例如：
   - 生成一个 wellness landing page 的 design system
   - 搜索 React 下 pricing table / loading state 的 UI 指导
   - 审查某个页面的 accessibility / UX 风险

3. 验收点：
   - AI 会先检查 `python3` 与 skill 资产是否存在
   - AI 会优先走只读检索，不会默认写文件
   - 输出中能看到风格、配色、字体、UX 规则或 stack guidance

4. 当用户明确要求落盘时，让 AI 执行 `--persist` 流程。

5. 验收点：
   - 只有在明确保存需求时才写入 `design-system/<project>/`
   - 会生成 `MASTER.md`
   - 如指定 page，还可继续生成 `pages/<page>.md`
