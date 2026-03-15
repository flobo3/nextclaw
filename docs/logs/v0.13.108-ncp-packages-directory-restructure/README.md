# 迭代完成说明

- 将 NCP 相关包统一迁移到 `packages/ncp-packages/` 目录下：
  - `@nextclaw/ncp`
  - `@nextclaw/ncp-toolkit`
  - `@nextclaw/ncp-http-agent-client`
  - `@nextclaw/ncp-http-agent-server`
  - `@nextclaw/ncp-agent-runtime`
- 更新 workspace 发现配置：
  - 根 `package.json` 的 `workspaces`
  - `pnpm-workspace.yaml`
- 更新根脚本中的 NCP 包路径：
  - `build`
  - `lint`
  - `tsc`
- 更新 `docker/Dockerfile` 中对 `@nextclaw/ncp` 的构建路径
- 更新活跃 README 与设计文档中的新目录路径
- 修正迁移后 5 个 NCP 包的 `tsconfig.json`，使其继续正确继承仓库根 `tsconfig.base.json`
- 执行 `pnpm install` 刷新 `pnpm-lock.yaml`，使锁文件和 workspace 映射与新目录结构一致

# 测试/验证/验收方式

- `pnpm install`
- `pnpm -C packages/ncp-packages/nextclaw-ncp tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp build`
- `pnpm -C packages/ncp-packages/nextclaw-ncp lint`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit build`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit lint`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-server tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-server build`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-server test`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-server lint`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client build`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client test`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client lint`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime build`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime lint`

# 发布/部署方式

- 本次仅调整仓库目录结构，未执行发布
- 后续如需发布，继续使用各包原有发布名，不变更 NPM 包名，仅变更仓库内物理路径

# 用户/产品视角的验收步骤

- 在仓库中确认所有 NCP 相关包都位于 `packages/ncp-packages/`
- 执行根脚本 `pnpm build` / `pnpm lint` / `pnpm tsc` 时，NCP 包仍会被纳入同一条流水线
- 打开各 NCP 包的 README，确认构建命令已指向 `packages/ncp-packages/*`
- 确认对外包名仍保持不变，例如 `@nextclaw/ncp`
