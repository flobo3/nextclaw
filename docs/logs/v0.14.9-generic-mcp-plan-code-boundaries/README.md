# v0.14.9 Generic MCP Plan Code Boundaries

## 迭代完成说明

本次迭代对既有 MCP 方案文档做了重要补充，把“产品级规划”继续收敛成“代码级组织方式与依赖边界”。

本次新增内容主要包括：

- 明确推荐新增独立平台包 `packages/nextclaw-mcp`，作为 MCP 领域能力的唯一拥有者。
- 明确 `nextclaw-core`、`nextclaw-mcp`、`nextclaw` CLI、未来 runtime consumer 的职责边界。
- 明确依赖方向必须为 `nextclaw-core -> schema only`、`nextclaw-mcp -> depends on core`、`app/runtime -> depends on nextclaw-mcp`，禁止反向依赖。
- 补充 `packages/nextclaw-mcp` 的建议目录结构、最小公开接口以及对现有仓库的最小接入点。
- 把实施阶段进一步拆成 `schema/types`、`registry/service`、`CLI`、`lifecycle/doctor`、`consumer` 五个代码写集，降低后续实现复杂度。

相关方案文档：

- [Generic MCP Registry Plan](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-19-generic-mcp-registry-plan.md)

## 测试 / 验证 / 验收方式

本次改动仅补充方案文档与新增迭代记录，未触达项目代码路径。

已执行：

- 文档内容检查：确认方案中已新增“代码组织与解耦边界”“代码级拆分建议”等章节。
- 版本基线检查：扫描 `docs/logs` 有效目录，确认新增版本从当前最大有效版本 `v0.14.8` 递增到 `v0.14.9`。

不适用：

- `build` 不适用，因为未触达构建链路。
- `lint` 不适用，因为未触达源码或可 lint 文件。
- `tsc` 不适用，因为未触达 TypeScript 代码。
- 冒烟测试不适用，因为本次未引入用户可运行行为改动。

## 发布 / 部署方式

本次迭代仅为方案文档增强，无需发布或部署。

后续进入编码阶段时，建议优先按文档中的代码写集推进：

1. `schema/types`
2. `registry/service`
3. `CLI`
4. `lifecycle/doctor`
5. `native` consumer

## 用户 / 产品视角的验收步骤

1. 打开方案文档，确认已经不止描述“做什么”，还明确说明“代码应该放哪里”。
2. 确认文档中已明确推荐新增独立的 `packages/nextclaw-mcp` 包，而不是把 MCP 复杂度塞进现有模块。
3. 确认文档中已明确写出依赖方向、最小接入点与禁止的反向依赖。
4. 确认文档中已把后续实施拆成多个互不污染的代码写集。
