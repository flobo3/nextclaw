# File Naming Convention

目标：统一仓库内文件命名风格，降低认知成本，提升可维护性。  
参考：Angular / NestJS 的“语义后缀”模式。

## 1. 总原则

- 统一使用 `kebab-case`（小写 + 连字符）。
- 文件名必须体现职责（通过后缀标识模块角色）。
- 禁止使用：`camelCase`、`PascalCase`、`snake_case` 作为文件名。
- 同一文件只承载一个主要角色；不要在一个文件里混合多种角色。

## 2. 命名结构

推荐结构：

```txt
<domain>.<role>.ts
<domain>-<subdomain>.<role>.ts
```

示例：

- `chat.controller.ts`
- `chat-stream.manager.ts`
- `chat-input.store.ts`
- `provider-auth.service.ts`
- `marketplace-plugin.controller.ts`

## 3. 角色后缀约定（全仓库默认收口）

允许后缀（同级，无优先级）：

- `.service.ts`: 服务/编排能力（有状态或跨模块协调逻辑）。
- `.utils.ts`: 纯工具函数（无状态、可复用、输入输出稳定）。
- `.types.ts`: 类型定义聚合（仅类型，不放运行时逻辑）。
- `.test.ts`: 测试文件。

- `.manager.ts`、`.store.ts`、`.repository.ts`、`.config.ts`
- `.controller.ts`、`.provider.ts`


## 4. 测试文件命名

- 单元测试：`<domain>.<role>.test.ts`
- 集成测试：`<domain>.<role>.int.test.ts`
- 端到端测试：`<domain>.<role>.e2e.test.ts`

示例：

- `cron.service.test.ts`
- `provider-auth.service.test.ts`

## 5. 目录与导出约定

- 优先 feature-first 目录组织（按业务域分目录）。
- `index.ts` 仅做导出聚合（barrel），不放业务逻辑。
- 避免模糊文件名：`utils.ts`、`helpers.ts`、`common.ts`（除非在明确子域目录下且职责单一）。

## 6. 反例

- `ChatController.ts`（非 kebab-case）
- `chatController.ts`（非 kebab-case）
- `chat_controller.ts`（snake_case）
- `controller.ts`（无业务域前缀，语义过弱）
- `chat.service.manager.ts`（多角色混合）
- `ui-bridge-api.client.ts`（若文件实际职责是服务编排而不是客户端职责，则命名与职责不匹配）
- `cron-job.view.ts`（若文件实际职责是纯工具而非视图职责，则命名与职责不匹配）
- `marketplace-installed-cache.ts`（如果实现只有纯映射 / view updater，而没有缓存协调）

## 7. 渐进迁移策略

- 新增文件：必须立即遵循本规范。
- 存量文件：按“改动即治理”原则，在触达文件时顺带迁移命名。
- 大规模改名：按模块分批进行，避免一次性跨仓库重命名导致冲突。
