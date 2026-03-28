# v0.14.266-codex-cli-env-path-preservation

## 迭代完成说明

本次修复的是 Codex 会话里 `command_execution` 相关能力不可用的问题，根因不是模型本身没有命令，而是 `@openai/codex-sdk` 的 CLI 环境被我们在接入层传窄了。

之前的实现只把插件侧自定义 env 传给 Codex，导致宿主进程里的 `PATH` 等基础变量没有进入 Codex CLI 子进程，模型即使发起命令执行，也会因为找不到常用命令而表现异常。

这次改动做了两件事：

- 新增 `buildCodexCliEnv()`，把宿主 `process.env`、插件自定义 env、`OPENAI_API_KEY`、`OPENAI_BASE_URL` 合并后再传给 Codex CLI。
- 清理了 Codex 输入构造里关于“环境里可能没有常用命令”的误导性提示，避免继续把根因伪装成模型能力问题。

## 测试/验证/验收方式

- `pnpm -C packages/extensions/nextclaw-ncp-runtime-codex-sdk exec tsc -p tsconfig.json --noEmit`
- `pnpm -C packages/extensions/nextclaw-ncp-runtime-codex-sdk build`
- `pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk exec tsc -p tsconfig.json --noEmit`
- `pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk build`
- `node node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs packages/extensions/nextclaw-ncp-runtime-codex-sdk/src/codex-cli-env.test.ts`
- 真实会话冒烟：
  - `pnpm smoke:ncp-chat -- --session-type codex --model minimax/MiniMax-M2.7 --base-url http://127.0.0.1:18793 --prompt "Use a shell command to print the current working directory and then reply with DONE." --json`
  - 随后沿用同一 `sessionId` 再发一条明确要求使用 shell 命令的请求，原始 SSE 返回体中确认包含 `command_execution`

验证结果：

- 上述 TypeScript 检查全部通过。
- 两个相关包的构建全部通过。
- `buildCodexCliEnv` 回归测试通过，确认 `PATH`、`HOME`、自定义 env 和 `OPENAI_*` 变量都被正确保留/注入。
- 在真实的 `codex` 会话里，二次请求的原始 SSE 事件流确认出现了 `command_execution`。

## 发布/部署方式

本次未做远端发布。

如果要让本机已经安装的 NextClaw/Codex 扩展立即生效，需要重新安装或重启加载该扩展的运行进程，让新构建产物进入实际运行环境。

## 用户/产品视角的验收步骤

1. 重启正在加载 Codex 扩展的 NextClaw 进程，确保使用的是这次构建后的产物。
2. 新建一个 Codex 会话。
3. 发送一个会触发命令执行的任务，例如要求列出目录或检查当前工作区。
4. 如果第一次回复仍是普通正文，再沿用同一会话追加一条明确要求“必须使用 shell 命令”的消息。
5. 观察原始 SSE 事件流里是否出现 `command_execution`。
6. 观察命令是否不再因为找不到 `ls`、`pwd`、`node`、`python3` 这类常见命令而失败。
