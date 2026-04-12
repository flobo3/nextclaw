# RFC: NCP 工具参数合同 v1

- 状态：提案中，建议作为项目默认规范
- 版本：`ncp-tool-argument-contract/v1`
- 最后更新：2026-04-12
- 作用域：`ncp` 工具定义、运行时参数校验、工具执行错误边界

## 1. 摘要

本文定义一套更轻量、更贴合现有架构的 NCP 工具参数合同方案。

目标只有两件事：

- 保证 runtime 真正按现有 `tool.parameters` 合同校验工具参数
- 保证工具失败停留在 tool level，而不是升级成 run-level fatal

本方案明确不做以下事情：

- 不新增工具合同包
- 不重写现有工具定义模型
- 不把 `zod` 引入为第二套事实源

核心决策只有一句话：

`tool.parameters` 继续作为唯一事实源，runtime 用完整 JSON Schema validator 执行它，再把工具执行异常统一收敛为结构化 tool result。

## 2. 问题

当前问题不是“没有参数事实源”，而是“已有事实源没有被 runtime 完整执行”。

现在已有的事实源是：

- `tool.name`
- `tool.description`
- `tool.parameters`

而且 `tool.parameters` 本来就会发给模型，天然就是对外合同。

真正的问题有两个：

1. runtime 当前使用的是手写的轻量 schema validator，只支持一小部分 JSON Schema 语义。
2. tool execution 抛错没有在 runtime 层归一化，导致工具级失败可能升级成 `RunError`，最终终止整轮对话。

这会带来四类系统性问题：

- 模型看到的参数合同和 runtime 实际执行的合同不一致
- `oneOf`、`anyOf`、`additionalProperties: false` 这类关键约束无法被完整执行
- 像 `file_path` 这样的未知字段可能漏过校验，直到 `execute()` 才报错
- 一个工具调用失败会被误升级成整个 run 的失败

## 3. 决策

采用最小必要的通用修法：

1. 保留 `tool.parameters` 作为唯一参数事实源。
2. runtime 用完整 JSON Schema validator 校验 `tool.parameters`。
3. `tool.validateArgs` 继续保留，但只处理 JSON Schema 不适合表达的语义校验。
4. runtime 在 `toolRegistry.execute()` 外统一加 `try/catch`。
5. 工具参数错误和工具执行错误都统一返回结构化 tool-level result。

不采用以下方向：

- 不新增 `ToolContract` 抽象层
- 不新增专门的合同包
- 不要求所有工具改写成 `zod`
- 不同时维护 `parameters` 与另一套独立 schema

## 4. 为什么这里更适合 `Ajv`，而不是统一上 `zod`

这里的核心判断不是“谁更高级”，而是“谁更适合当前架构”。

当前前提是：

- `tool.parameters` 已经存在
- `tool.parameters` 已经是模型侧工具 schema 的来源
- 它已经是当前系统的参数事实源

在这个前提下，如果再额外给所有工具补一份 `zod` 校验，会带来双事实源风险：

- 一份 `parameters`
- 一份 `zod`

一旦两边漂移，系统会比现在更难维护。

因此这里更合理的通用方案是：

- 继续使用现有 `parameters`
- 用 `Ajv` 这类成熟 JSON Schema validator 在 runtime 执行它

选择 `Ajv` 的主要原因是：

- 它直接消费 JSON Schema，和现有 `parameters` 形态一致
- 不需要引入第二套 schema authoring 机制
- 支持完整得多的 JSON Schema 语义
- 性能通常也优于 `zod`

这里选择 `Ajv` 的第一理由是“避免双事实源”，性能只是附带收益，不是主决策因素。

## 5. 架构

## 5.1 Primary Contract

工具参数的 primary contract 明确定义为：

- `tool.parameters`

runtime 的职责不是重新发明一套合同，而是忠实执行这份合同。

## 5.2 Runtime Pipeline

每次工具调用都必须走同一条 pipeline：

1. 把模型给出的 raw JSON text parse 成 object。
2. 根据 tool name 找到工具。
3. 用 JSON Schema validator 校验 `tool.parameters`。
4. 如果 schema 校验失败，返回 `invalid_tool_arguments`。
5. 如果 schema 校验通过，再执行可选 `tool.validateArgs`。
6. 如果语义校验失败，返回 `invalid_tool_arguments`。
7. 如果参数有效，在 runtime 拥有的 `try/catch` 内执行 `toolRegistry.execute()`。
8. 如果 `execute()` 抛异常，返回结构化 tool execution error。
9. 除非是真正的 runtime、transport、stream、系统级错误，否则继续 run loop。

## 5.3 职责边界

各层职责应明确如下：

- `tool.parameters`
  - 负责字段结构、类型、required、组合约束、unknown key 约束
- `tool.validateArgs`
  - 负责 schema 不适合表达的语义约束
  - 例如依赖 session、权限、上下文的校验
- `tool.execute`
  - 只负责业务执行
  - 不再承担主参数合同的兜底职责
- `runtime`
  - 负责统一校验、统一错误归一化、统一事件输出

## 5.4 错误边界

规范要求：

- 工具参数错误不得升级成 `RunError`
- 工具执行错误不得默认升级成 `RunError`
- `RunError` 只用于 runtime、transport、stream、系统级故障

tool-level 统一错误结果建议至少覆盖：

- `invalid_tool_arguments`
- `tool_execution_failed`
- `tool_permission_denied`
- `tool_timeout`
- `tool_not_found`
- `tool_unavailable`

## 5.5 严格性策略

为了保证行为清晰、可预测，默认策略如下：

- 默认拒绝未知字段
- 默认禁止 silent alias
- 默认优先 fail-fast，而不是隐藏兜底

这意味着：

- `file_path` 不应该被静默当成 `path`
- 如果迁移期真的需要兼容旧字段，必须显式声明、可观测、临时存在，并记录移除条件

## 6. Schema 书写要求

这次系统性修复不只包括“换 validator”，还包括“把现有 schema 写完整”。

以后工具 schema 至少应遵守以下要求：

1. 能写 `required` 的必须写 `required`
2. 能写 `additionalProperties: false` 的默认应写
3. 存在互斥或多分支参数形态时，优先用 `oneOf` / `anyOf`
4. `validateArgs` 不应用来兜基础字段缺失或字段名错误

## 7. 示例：`asset_put`

`asset_put` 这类工具更适合直接把 `parameters` 写完整，而不是让 `execute()` 再兜底判断。

示意写法：

```json
{
  "type": "object",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "path": { "type": "string" },
        "fileName": { "type": "string" },
        "mimeType": { "type": "string" }
      },
      "required": ["path"],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "bytesBase64": { "type": "string" },
        "fileName": { "type": "string" },
        "mimeType": { "type": "string" }
      },
      "required": ["bytesBase64", "fileName"],
      "additionalProperties": false
    }
  ]
}
```

这样可以保证：

- `file_path` 在 schema 层直接被拒绝
- `bytesBase64` 缺少 `fileName` 在 schema 层直接被拒绝
- `execute()` 可以从主参数兜底中瘦身

## 8. 迁移策略

建议按最小风险顺序推进。

## 8.1 Phase 0：先修 runtime 错误边界

先解决最影响用户体验的问题：

1. 在 runtime 中包住 `toolRegistry.execute()`
2. 把工具抛出的异常转换成结构化 tool result
3. 工具失败后继续对话 loop，而不是直接终止整轮对话

这是第一优先级。

## 8.2 Phase 1：用 `Ajv` 替换手写轻量 validator

在 runtime 内部把当前手写 `validateToolArgs` 升级为完整 JSON Schema 校验：

- 保持调用入口不变
- 保持 `tool.parameters` 作为输入
- 删除不再必要的 schema 子集实现

## 8.3 Phase 2：补齐重点工具的 schema

优先补齐参数复杂度高、用户影响大的工具：

1. `asset_put`
2. 文件读写工具
3. exec / external-command 工具
4. session / spawn 工具

目标不是给每个工具新增一层抽象，而是把已有 `parameters` 写完整。

## 8.4 Phase 3：收缩 execute 中的参数兜底逻辑

当 schema 和 runtime 校验已经足够完整后：

- 删除 `execute()` 中重复的基础参数判断
- 保留真正属于业务执行阶段的错误

## 9. 测试要求

这套方案至少要覆盖三层测试：

1. Validator 层测试
   - `oneOf` / `anyOf`
   - `additionalProperties: false`
   - required 组合约束
2. Runtime 层测试
   - invalid args 返回 `MessageToolCallResult`
   - 工具抛异常返回 `MessageToolCallResult`
   - 工具失败后 run loop 继续
3. 代表性工具测试
   - `asset_put`
   - 至少一个 exec 或 file tool

## 10. 验收标准

- `tool.parameters` 继续是唯一参数事实源
- runtime 按完整 JSON Schema 语义执行 `tool.parameters`
- 未知字段不会漏到 `execute()`
- 组合约束不会依赖 `execute()` 兜底
- 工具失败默认不会终止整轮对话
- runtime 不再长期依赖手写的半套 schema validator

## 11. 推荐落地顺序

推荐顺序：

1. 先修 runtime tool execution 错误边界
2. 接入 `Ajv`
3. 补齐 `asset_put` 等重点工具 schema
4. 删除重复的 execute 参数兜底

这个顺序最符合当前问题，也最符合“删减优先、简化优先、事实源唯一”的长期方向。

## 12. 文档位置说明

本文放在 `docs/rfcs`，因为它定义的是跨包适用的规范合同：

- 工具参数事实源是什么
- runtime 应该如何执行这份合同
- 工具错误和 run 错误的边界是什么

如果团队批准进入实现阶段，应另建一份 `docs/plans` 执行计划，拆解具体改哪些文件、哪些测试、按什么顺序推进。
