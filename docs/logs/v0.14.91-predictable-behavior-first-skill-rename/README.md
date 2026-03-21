# v0.14.91-predictable-behavior-first-skill-rename

## 迭代完成说明

- 将本地 skill 从 `problem-exposure-first` 重命名为更直白的 `predictable-behavior-first`
- 将 skill 总纲补充为“代码行为应该明确、清晰、可预测；不需要惊喜和惊吓”
- 将参考文档同步更名为 `predictable-behavior-policy.md`，使 skill 名称、目录名称与原则表达保持一致

## 测试/验证/验收方式

- 检查 skill 目录存在：
  - `.codex/skills/predictable-behavior-first/SKILL.md`
  - `.codex/skills/predictable-behavior-first/references/predictable-behavior-policy.md`
- 检查 `SKILL.md` frontmatter 的 `name` 为 `predictable-behavior-first`
- 检查 `SKILL.md` 是否包含“explicit, clear, and predictable / surprise success / surprise failure”表达
- 检查 `SKILL.md` 中对参考文档的引用已改为 `[references/predictable-behavior-policy.md](references/predictable-behavior-policy.md)`

## 发布/部署方式

- 本次为项目内本地 skill 与文档改名，不涉及 npm、部署或远程 migration
- 将仓库同步到后续工作分支或默认分支后，新名称即可在本项目中被发现和使用

## 用户/产品视角的验收步骤

- 在本项目内提出“是否要加 fallback / 兼容 / 兜底 / 旧路径保留”的需求
- 确认助手会以 `predictable-behavior-first` 视角进行判断
- 确认输出优先强调“行为明确、清晰、可预测”，并主动避免制造 surprise success / surprise failure
