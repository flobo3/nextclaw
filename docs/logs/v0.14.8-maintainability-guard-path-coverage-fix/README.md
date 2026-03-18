# 迭代完成说明

- 修复 `post-edit-maintainability-guard` 对未跟踪目录的漏检问题：当 `git status --porcelain` 返回目录项时，脚本现在会递归收集目录下的代码文件，并继续沿用现有忽略规则过滤 `node_modules`、`dist` 等路径。
- 收紧 `config.ts` 的可维护性预算判定：不再因为裸名 `config.ts` 自动按“纯配置文件”放宽到 900 行预算，只有明确的纯配置命名（如 `*.config.ts`）才走宽松预算。
- 更新 skill 文档，使预算规则与脚本实现保持一致，避免“文档说一套、脚本跑一套”。

# 测试/验证/验收方式

- 全量观察当前脏工作区的守卫结果：

```bash
python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --json --no-fail
```

- 验证 `config.ts` 已按更严格规则判定为阻塞项：

```bash
python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/nextclaw-ui/src/api/config.ts --json --no-fail
```

- 验证本次修改后的守卫脚本自身未触发新的可维护性风险：

```bash
python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py
```

# 发布/部署方式

- 本次变更仅触达仓库内 skill 脚本与说明文档，无独立发布或部署动作。
- 后续按正常仓库提交流程合入即可；如需在其它环境生效，确保使用同一仓库版本即可。

# 用户/产品视角的验收步骤

1. 保持当前仓库中存在未跟踪的新代码目录，例如 `packages/extensions/nextclaw-ncp-runtime-codex-sdk/`。
2. 运行守卫脚本并查看 `inspected_paths`，确认该目录下的 `.ts` / `.cjs` / `.tsup.config.ts` 等代码文件已被纳入检查，而不是整目录被忽略。
3. 再对 `packages/nextclaw-ui/src/api/config.ts` 单独执行守卫，确认它不再被当作“纯配置文件”宽松放过，而会以默认预算触发阻塞。
4. 确认输出仍保留原有风险文件、预算、增量和建议拆分缝信息，说明补丁只补齐漏检与误分类，没有破坏原有报告格式。
