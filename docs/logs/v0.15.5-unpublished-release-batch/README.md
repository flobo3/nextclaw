# v0.15.5-unpublished-release-batch

## 迭代完成说明

- 盘点并收敛了 2026-03-31 当天已提交但尚未完成发布闭环的公开包漂移，新增统一 changeset，按一轮 patch batch 完成版本提升、npm 发布与 git tag。
- 本轮核心覆盖了今天新增的聊天能力与运行链路改动，包括：
  - skill token 在消息中的渲染与最近使用 skill 排序更新
  - 聊天运行中禁用 Enter 直接发送
  - tool argument 校验在 `@nextclaw/core / @nextclaw/ncp / @nextclaw/ncp-agent-runtime` 链路上的收紧
- 发布校验过程中暴露出 `packages/nextclaw-ui/src/components/chat/chat-input/chat-input-bar.controller.ts` 的 React Compiler lint 阻塞；已将该 hook 从整对象 `params` 闭包改为显式字段解构依赖，消除 `preserve-manual-memoization` error，并重新完成整轮发布。
- 已发布包：
  - `@nextclaw/agent-chat-ui@0.2.17`
  - `@nextclaw/core@0.11.14`
  - `@nextclaw/ui@0.11.19`
  - `@nextclaw/ncp@0.4.4`
  - `@nextclaw/ncp-agent-runtime@0.3.4`
  - `@nextclaw/ncp-react-ui@0.2.9`
  - `nextclaw@0.16.29`
  - 以及依赖闭环联动包：`@nextclaw/channel-*`、`@nextclaw/channel-runtime`、`@nextclaw/mcp`、`@nextclaw/ncp-*`、`@nextclaw/nextclaw-engine-*`、`@nextclaw/nextclaw-ncp-runtime-*`、`@nextclaw/openclaw-compat`、`@nextclaw/remote`、`@nextclaw/runtime`、`@nextclaw/server`

## 测试/验证/验收方式

- 发布前批次校验：
  - `PATH="$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH" pnpm release:check:groups`
  - `PATH="$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH" pnpm release:report:health`
  - `PATH="$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH" pnpm lint:maintainability:guard`
- 发布中批次校验：
  - `PATH="$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH" NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`
  - 结果：整轮 `build / lint / tsc` 通过；仓库既有 warning 保留，但无 error；`changeset publish` 输出 `packages published successfully`，并完成对应 git tags 创建。
- 定向修复复验：
  - `PATH="$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH" pnpm -C packages/nextclaw-ui lint`
  - `PATH="$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH" pnpm -C packages/nextclaw-ui tsc`
- 发布后冒烟：
  - `TMP_DIR=$(mktemp -d /tmp/nextclaw-release-smoke.XXXXXX) && cd "$TMP_DIR" && npm init -y && NEXTCLAW_HOME="$TMP_DIR/home" npm install nextclaw@0.16.29 && NEXTCLAW_HOME="$TMP_DIR/home" npx --yes nextclaw --version`
  - 结果：成功安装，输出 `0.16.29`

## 发布/部署方式

- 本次为 npm 包统一发布，不涉及远程 migration，也不涉及平台/前端站点单独部署。
- 标准闭环：
  - `pnpm release:version`
  - `pnpm release:publish`
- 发布凭据通过仓库根目录 `.npmrc` 提供，并通过 `NPM_CONFIG_USERCONFIG` 显式指向项目凭据文件。

## 用户/产品视角的验收步骤

1. 在任意隔离目录执行 `npm install nextclaw@0.16.29` 或 `npx --yes nextclaw@0.16.29 --version`。
2. 确认 CLI 返回版本号 `0.16.29`，说明用户已拿到本轮发布结果。
3. 启动聊天界面后验证：
   - 运行中的会话按 Enter 不会重复触发发送。
   - 最近使用过的 skill 在选择器与 slash menu 中优先展示。
   - 已选 skill token 能在消息内容中正确渲染。
4. 如需验证运行链路一致性，可继续检查基于 message/tool 的调用场景，确认 tool argument 非法输入会被更严格拦截。
