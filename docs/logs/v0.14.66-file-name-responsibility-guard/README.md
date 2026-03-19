# v0.14.66-file-name-responsibility-guard

## 迭代完成说明

- 在 [AGENTS.md](../../../AGENTS.md) 新增 `file-name-must-match-primary-responsibility` 规则，明确“文件名必须准确表达主职责”，并要求在触达存量文件时按“改动即治理”评估是否需要重命名。
- 补强 [AGENTS.md](../../../AGENTS.md) 中的 `post-edit-maintainability-guard-required` 规则，使其显式覆盖“文件名-职责错配”的 diff-only 检查。
- 更新 [docs/workflows/file-naming-convention.md](../../workflows/file-naming-convention.md)，补充 `.cache.ts` / `*-cache.ts` 的职责定义，并加入“纯映射 / view updater 不应命名为 cache”的反例。
- 更新 [post-edit-maintainability-guard skill 文档](../../../.codex/skills/post-edit-maintainability-guard/SKILL.md)，把命名职责一致性纳入 guard 的检查范围、阻塞条件、警告条件和输出约定。
- 扩展 guard 脚本 [maintainability-guard-support.mjs](../../../.codex/skills/post-edit-maintainability-guard/scripts/maintainability-guard-support.mjs) 与 [maintainability-guard-core.mjs](../../../.codex/skills/post-edit-maintainability-guard/scripts/maintainability-guard-core.mjs)，新增高置信度的命名职责检查：当前优先识别“文件名声明 `cache`，但实现更像 pure mapper / updater 且缺少缓存协调信号”的场景。

## 测试/验证/验收方式

- 语法检查：
  - `PATH=/opt/homebrew/bin:$PATH node --check .codex/skills/post-edit-maintainability-guard/scripts/maintainability-guard-support.mjs`
  - `PATH=/opt/homebrew/bin:$PATH node --check .codex/skills/post-edit-maintainability-guard/scripts/maintainability-guard-core.mjs`
  - `PATH=/opt/homebrew/bin:$PATH node --check .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs`
- guard 自检（仅本次触达脚本）：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --json --no-fail --paths .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs .codex/skills/post-edit-maintainability-guard/scripts/maintainability-guard-support.mjs .codex/skills/post-edit-maintainability-guard/scripts/maintainability-guard-core.mjs`
  - 结果：`errors = 0`，`warnings = 0`
- 命名职责样例验证：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --json --no-fail --paths packages/nextclaw-ui/src/components/marketplace/marketplace-installed-cache.ts`
  - 结果：命中 `filename-role` 警告，识别 `cache` 命名与 pure mapping / updater 语义不一致。

## 发布/部署方式

- 本次为仓库规则与本地 guard 脚本增强，不涉及线上服务部署、数据库迁移或 NPM/GitHub Release。
- 合并后即对后续开发任务生效；执行 `post-edit-maintainability-guard` 时会自动带出新增的命名职责检查。

## 用户/产品视角的验收步骤

1. 触达一个带 `cache` 命名但实际只做纯映射/updater 的文件，运行 `post-edit-maintainability-guard`。
2. 确认输出中出现 `source=filename-role` 或 `naming_findings`，并给出“建议改名为 mapper/utils 或拆出真实 cache 模块”的提示。
3. 再对本次真正修改过的 guard 脚本运行同一命令，确认无新增错误或警告。
4. 查阅 [AGENTS.md](../../../AGENTS.md) 与 [docs/workflows/file-naming-convention.md](../../workflows/file-naming-convention.md)，确认规则文本与自动检查的判定方向一致。
