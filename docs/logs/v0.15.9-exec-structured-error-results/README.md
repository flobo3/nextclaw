# v0.15.9-exec-structured-error-results

## 迭代完成说明

- 将 `packages/nextclaw-core/src/agent/tools/shell.ts` 的 `exec` 返回从“字符串拼接结果”升级为稳定的结构化结果对象，统一保留：
  - `ok`
  - `command`
  - `workingDir`
  - `exitCode`
  - `errorCode`
  - `signal`
  - `stdout`
  - `stderr`
  - `durationMs`
  - `timedOut`
  - `killed`
  - `stdoutTruncated`
  - `stderrTruncated`
  - 以及失败时的 `message`
- 修复了命令失败场景下的信息损失问题：不再只把 `String(err)` 塞回 AI，而是保留 `stdout/stderr/exitCode/signal` 等关键诊断字段。
- 将 safety guard 拦截结果也统一成同一结构化契约，避免 `exec` 在“成功 / 失败 / 拦截”三种路径上返回三套不同语义。
- 补充并更新了 `packages/nextclaw-core/src/agent/tools/shell.test.ts`，覆盖：
  - 成功返回结构化结果
  - 非零退出码时保留 `stdout/stderr/exitCode`
  - safety guard 拦截时返回结构化 blocked 结果
- 触达 `ExecTool` class 后，按仓库治理要求把普通实例方法统一收敛为箭头函数 class field，消除增量治理告警。
- 设计方向参考了外部成熟实现中“命令执行结果保留结构化字段”的处理思路：
  - OpenAI Codex: <https://github.com/openai/codex>
  - Claude Code sourcemap: <https://github.com/Peiiii/claude-code-sourcemap>

## 测试 / 验证 / 验收方式

- 定向单测：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core exec vitest run src/agent/tools/shell.test.ts`
- 定向 ESLint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core exec eslint src/agent/tools/shell.ts src/agent/tools/shell.test.ts`
- 增量治理：
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:new-code:governance`
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-core/src/agent/tools/shell.ts packages/nextclaw-core/src/agent/tools/shell.test.ts`
- 结果：
  - 单测通过
  - ESLint 通过
  - 增量治理通过
  - maintainability guard 无 error，保留 2 条既有/趋势 warning：
    - `packages/nextclaw-core/src/agent/tools` 目录预算 warning
    - `packages/nextclaw-core/src/agent/tools/shell.ts` 接近文件预算 warning

## 发布 / 部署方式

- 本次未执行发布 / 部署。
- 若后续需要随版本发布，按项目既有 npm / release 流程进入下一轮发布闭环即可；本迭代仅完成代码与验证收口。

## 用户 / 产品视角的验收步骤

1. 在 NextClaw 会话里触发一次成功的 `exec`，例如 `echo hello`。
2. 确认 tool result 不再只是裸文本，而是包含 `stdout/stderr/exitCode` 等字段的结构化结果。
3. 再触发一次失败命令，例如 `sh -lc "echo OUT; echo ERR 1>&2; exit 7"`。
4. 确认 AI 能拿到：
   - `stdout = OUT`
   - `stderr = ERR`
   - `exitCode = 7`
   - 对应失败 `message`
5. 再触发一次被 safety guard 拦截的命令，例如危险删除命令。
6. 确认返回仍是结构化结果，并带有 `blocked = true` 与 `blockedReason`，而不是只剩一句模糊报错字符串。
