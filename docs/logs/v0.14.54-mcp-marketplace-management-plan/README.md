# v0.14.54-mcp-marketplace-management-plan

## 迭代完成说明

本次新增了一份面向 MCP marketplace 与管理能力的设计/规划文档，目标是为后续实现提供清晰边界，重点包括：

- 明确 MCP 应作为与 skill、plugin 平行的独立域，而不是继续扩张现有泛型 marketplace 类型。
- 明确前端需要同时覆盖 catalog 发现与 installed/manage 视角，而不是只有“安装”入口。
- 明确 server、CLI、frontend 都应复用 `@nextclaw/mcp` 域服务，不应各自直接写 config。
- 明确 marketplace 安装后的默认语义应是公共资源池，默认 scope 为 `all-agents`，`agent` 级 scope 仅作为高级可选能力保留。
- 明确 marketplace worker、server controller、前端页面、CLI 的推荐文件边界与分阶段落地计划。

相关文档：

- [MCP Marketplace And Management Implementation Plan](../../plans/2026-03-19-mcp-marketplace-management-plan.md)
- [Generic MCP Registry Plan](../../plans/2026-03-19-generic-mcp-registry-plan.md)

## 测试/验证/验收方式

本次仅新增方案文档，未触达运行时代码。

已执行的验证：

- 检查现有 `skill` / `plugin` marketplace 链路结构，确保新方案对齐现有 worker/server/ui 分层。
- 检查现有 MCP CLI、registry、reload/hotplug 边界，确保方案与现有 MCP 主链路一致。
- 检查 `docs/logs` 当前有效版本，按规则新增更高版本迭代目录。

本次不适用：

- `build`
- `lint`
- `tsc`
- 运行态冒烟

原因：本次未触达项目代码，仅为设计规划与文档留痕。

## 发布/部署方式

本次为方案规划文档，无需独立发布或部署。

后续若进入实现阶段，应按方案中的分阶段计划推进，并在代码落地后执行对应包的构建、校验、冒烟与发布闭环。

## 用户/产品视角的验收步骤

1. 打开方案文档，确认其覆盖了 marketplace、管理、前端、server、worker、CLI 与域服务边界。
2. 确认方案明确写出：MCP 不应直接塞进现有 `plugin | skill` 泛型页面。
3. 确认方案明确写出：默认 scope 是 `all-agents`，而不是先默认收紧。
4. 确认方案给出了可执行的分阶段落地计划，而不是只有概念描述。
