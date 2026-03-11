# v0.13.62-ncp-package-skeleton

## 迭代完成说明（改了什么）

- 新增通用协议包 `@nextclaw/ncp`：`packages/nextclaw-ncp`。
- 完成包级基础设施：
  - `package.json`（`build/lint/tsc` 脚本、`exports`、`workspace:*` 依赖 `@nextclaw/core`）
  - `tsconfig.json`
  - `.eslintrc.cjs`（含 `max-lines` 与 `max-lines-per-function`）
  - `README.md`、`CHANGELOG.md`
- 完成 TypeScript 协议骨架：
  - `manifest`、`message`、`errors`、`session`、`stream`、`endpoint` 类型定义
  - `AbstractEndpoint`、`AbstractAgentEndpoint` 抽象基类
  - `config-readers`、`prompt-builder` 共享工具
- 根脚本链路接入新包：
  - 根 `package.json` 的 `build` / `lint` / `tsc` 增加 `packages/nextclaw-ncp`。

## 测试/验证/验收方式

- 依赖与锁文件更新：
  - `PATH=/opt/homebrew/bin:$PATH pnpm install`
- 新包静态校验：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ncp lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ncp tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ncp build`
- 结果：
  - 三项均通过，`dist/index.js` 与 `dist/index.d.ts` 正常产出。
- 不适用项：
  - 冒烟测试不适用（本次为协议与抽象骨架搭建，未引入新的用户可见运行路径）。

## 发布/部署方式

- 本次仅完成包骨架与协议类型定义，不执行 npm 发布。
- 后续进入实现阶段（插件重构/端点接入）后，再按项目 npm 发布流程执行 `changeset -> version -> publish`。

## 用户/产品视角的验收步骤

1. 在仓库中确认存在新包目录：`packages/nextclaw-ncp`。
2. 查看 `src/types`，确认已具备通用协议轮廓（manifest/message/stream/endpoint）。
3. 查看 `src/endpoint`，确认已具备通用抽象基类与 Agent 兼容基类。
4. 执行 `pnpm -C packages/nextclaw-ncp build`，确认新包可独立构建。
