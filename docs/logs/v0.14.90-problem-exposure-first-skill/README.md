# v0.14.90-problem-exposure-first-skill

## 迭代完成说明

- 在项目内新增本地 skill `problem-exposure-first`
- 将“优先暴露真实问题、限制乱兜底、限制过度兼容”的判断原则沉淀为可触发的操作指引
- 为该 skill 补充参考文档，明确允许例外、禁止模式、评审问题清单与正反例

## 测试/验证/验收方式

- 检查新增 skill 文件存在：
  - `.codex/skills/problem-exposure-first/SKILL.md`
  - `.codex/skills/problem-exposure-first/references/fallback-compat-policy.md`
- 检查 `SKILL.md` 的 frontmatter 含 `name` 与 `description`
- 检查 `SKILL.md` 是否明确覆盖 fallback、backward compatibility、graceful degradation、legacy retention、cwd/environment rescue path 等触发场景
- 检查引用路径 `[references/fallback-compat-policy.md](references/fallback-compat-policy.md)` 可从 `SKILL.md` 直接发现

## 发布/部署方式

- 本次为项目内 skill/文档新增，不涉及 npm、部署或远程 migration
- 将仓库更新同步到后续工作分支或默认分支后，新的本地 skill 即可在本项目上下文中被发现和使用

## 用户/产品视角的验收步骤

- 在本项目内提出涉及“兜底 / 兼容 / graceful degradation / legacy 保留 / 自动探测环境救火”的需求
- 确认助手会触发 `problem-exposure-first` skill
- 确认输出不再默认偏向“多加兼容”，而会先判断是否在掩盖真实缺陷，再给出 fail-fast / dev-only / 临时保留三类结论
