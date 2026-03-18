# v0.13.186-marketplace-skill-publisher-skill

## 迭代完成说明（改了什么）

- 新增项目内 skill：[`marketplace-skill-publisher`](/Users/peiwang/Projects/nextbot/.codex/skills/marketplace-skill-publisher/SKILL.md)
- 为该 skill 增加 UI 元数据：[`agents/openai.yaml`](/Users/peiwang/Projects/nextbot/.codex/skills/marketplace-skill-publisher/agents/openai.yaml)
- 新增确定性校验脚本：[`scripts/validate_marketplace_skill.py`](/Users/peiwang/Projects/nextbot/.codex/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py)
- skill 固化了本项目 marketplace skill 的标准闭环：
  - 校验 `skills/<slug>` 下 `SKILL.md` 与 `marketplace.json`
  - 校验 `marketplace.json` 中英双语字段
  - 使用项目 CLI 执行 `publish/update`
  - 远端 `GET` 校验
  - 非仓库目录安装冒烟

## 测试/验证/验收方式

- 通过：`python3 .codex/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/humanizer`
- 通过：`python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths .codex/skills/marketplace-skill-publisher/SKILL.md .codex/skills/marketplace-skill-publisher/agents/openai.yaml .codex/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py`
- 说明：
  - `build/lint/tsc` 不适用，本次未触达项目构建、类型或运行主链路代码
  - 验收重点为 skill 文档可执行性与校验脚本的真实输出

## 发布/部署方式

1. 本次无额外服务部署动作
2. 合并代码后，后续在本仓库执行 marketplace skill 上架时，优先调用该 skill
3. 标准发布命令仍为：
   - `node packages/nextclaw/dist/cli/index.js skills publish skills/<slug> --meta skills/<slug>/marketplace.json --api-base https://marketplace-api.nextclaw.io`
   - `node packages/nextclaw/dist/cli/index.js skills update skills/<slug> --meta skills/<slug>/marketplace.json --api-base https://marketplace-api.nextclaw.io`

## 用户/产品视角的验收步骤

1. 准备一个本地 skill 目录 `skills/<slug>`
2. 补齐 `SKILL.md` 与 `marketplace.json`
3. 执行：
   - `python3 .codex/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/<slug>`
4. 若校验通过，按 skill 指引执行 `publish` 或 `update`
5. 发布后执行远端 `GET /api/v1/skills/items/<slug>` 与 `/tmp` 安装冒烟
6. 验收点：
   - 不再靠人工临时回忆发布流程
   - 中英双语元数据不会漏
   - 发布后默认会补远端校验与安装冒烟
