# v0.14.185-agent-runtime-tool-catalog-visibility

## 迭代完成说明

- 修复 NextClaw agent / NCP 对动态插件工具“看不见”的根因问题：系统提示词里的工具目录不再写死，而是改为读取运行时真实工具定义后统一注入。
- 在 `@nextclaw/core` 新增共享工具目录构建模块，统一生成 prompt 展示所需的工具清单，避免为飞书或任一插件做平台特判。
- `ContextBuilder` 改为支持接收运行时 `availableTools`，`AgentLoop` 与 `NextclawNcpContextBuilder` 都接入同一套动态目录构建逻辑，确保主 agent 与 nextclaw agent 看到的是当前真实可用工具。
- 新增覆盖测试，验证扩展工具如 `feishu_doc` 会进入 system prompt，而不是继续停留在历史写死列表。
- 讨论与根因分析记录见 [飞书能力可见性差距分析](../../plans/2026-03-25-feishu-capability-visibility-gap-analysis.md)。

## 测试 / 验证 / 验收方式

- 可维护性闸门
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-core/src/agent/context.ts packages/nextclaw-core/src/agent/loop.ts packages/nextclaw-core/src/agent/context.test.ts packages/nextclaw-core/src/agent/loop.tool-catalog.test.ts packages/nextclaw-core/src/agent/tool-catalog.utils.ts packages/nextclaw-core/src/index.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts`
- 单测
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core exec vitest run src/agent/context.test.ts src/agent/loop.tool-catalog.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts`
- 构建 / lint / typecheck
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- 冒烟
  - 构建产物冒烟
    - `PATH=/opt/homebrew/bin:$PATH node --input-type=module <<'NODE' ... import { ContextBuilder } from './packages/nextclaw/dist/index.js' ... NODE`
    - 结果：通过，输出 `[tool-catalog-smoke] passed`，确认构建后的 `nextclaw` 包能把 `feishu_doc` 注入 system prompt。
  - NCP 冒烟
    - `PATH=/opt/homebrew/bin:$PATH pnpm exec tsx <<'TS' ... new NextclawNcpContextBuilder(...) ... TS`
    - 结果：通过，输出 `[ncp-tool-catalog-smoke] passed`，确认 NCP prepare 后的 system prompt 同样包含 `feishu_doc`。

## 发布 / 部署方式

- NPM package release
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`
  - 结果：成功。已发布 `nextclaw@0.15.0`、`@nextclaw/core@0.11.0`，并联动发布 `@nextclaw/channel-plugin-feishu@0.2.17`、`@nextclaw/channel-runtime@0.4.0`、`@nextclaw/openclaw-compat@0.3.24`、`@nextclaw/server@0.10.42` 等受影响包；changeset 自动创建对应 git tags。
- 不适用项
  - 远程 migration：本次未触达后端 / 数据库
  - 平台部署：本次未触达平台站点或 worker

## 用户 / 产品视角的验收步骤

1. 在安装了飞书插件且已注册相关工具的环境中启动 NextClaw。
2. 直接询问 agent “我现在有哪些工具” 或要求它使用飞书文档工具。
3. 确认系统提示词驱动下的工具目录中出现 `feishu_doc` 等动态插件工具，而不是只显示固定内置工具。
4. 通过 nextclaw agent 或 NCP 会话再次提问同类问题，确认两条入口都能识别并调用相同的运行时工具集合。

## 红区触达与减债记录

### packages/nextclaw-core/src/agent/loop.ts

- 本次是否减债：是，部分减债。
- 说明：本次为接入运行时真实工具目录触达 `loop.ts`，同时把文件总行数与 `processMessage` 行数压回到历史基线以下，避免继续恶化；但该文件与函数仍处于仓库红区，历史超长债尚未清零。
- 下一步拆分缝：优先拆出 session lookup / tool loop orchestration / response finalization 三段职责，继续降低 `processMessage` 的长度与语句数。
