# v0.13.116-ncp-react-package-skeleton

## 迭代完成说明（改了什么）

- 新增 `@nextclaw/ncp-react` 子包最小骨架，路径为 `packages/ncp-packages/nextclaw-ncp-react`。
- 创建空入口 `src/index.ts` 与 `src/hooks/index.ts`，暂不提供任何实际能力，仅建立后续补充能力的包边界。
- 补齐子包基础配置：`package.json`、`tsconfig.json`、`eslint.config.mjs`。
- 将该子包接入根目录 `build`、`lint`、`tsc` 脚本链路。

## 测试/验证/验收方式

- 执行 `pnpm -C packages/ncp-packages/nextclaw-ncp-react lint`
- 执行 `pnpm -C packages/ncp-packages/nextclaw-ncp-react tsc`
- 执行 `pnpm -C packages/ncp-packages/nextclaw-ncp-react build`

## 发布/部署方式

- 当前无需单独发布；后续当包开始提供实际能力时，按仓库既有 NPM 发布流程纳入发布闭环。

## 用户/产品视角的验收步骤

1. 打开 `packages/ncp-packages/nextclaw-ncp-react`，确认包基础文件已存在。
2. 打开 `packages/ncp-packages/nextclaw-ncp-react/src/hooks`，确认已预留 hooks 目录。
3. 运行该包的 `lint`、`tsc`、`build`，确认空骨架可通过校验。
