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

## 3. 角色后缀约定

- `.controller.ts`: 路由/请求入口层，负责协议适配与参数校验，不承载核心业务编排。
- `.manager.ts`: 业务流程编排层（状态流转、跨服务协同）。
- `.store.ts`: 状态存储层（如 Zustand/store 容器）。
- `.service.ts`: 领域服务层，承载可复用业务能力。
- `.repository.ts`: 数据访问层（DB/文件/远端持久化）。
- `.adapter.ts`: 外部系统适配层（第三方 SDK、协议桥接）。
- `.gateway.ts`: 进程/网络入口网关层（长连接、消息网关等）。
- `.middleware.ts`: 中间件。
- `.guard.ts`: 权限/前置校验。
- `.interceptor.ts`: 拦截器。
- `.factory.ts`: 工厂构建。
- `.schema.ts`: schema/验证定义。
- `.types.ts`: 类型声明聚合（仅类型）。
- `.constants.ts`: 常量定义。
- `.utils.ts`: 纯工具函数（无状态、无副作用优先）。
- `.mapper.ts`: 结构映射/转换。
- `.cache.ts` / `*-cache.ts`: 缓存键、缓存读写、失效、query client 协调或 optimistic cache 更新；若文件只做纯映射、去重、拼装或 view updater，不应命名为 `cache`。
- `.config.ts`: 配置加载与组装。

## 4. 测试文件命名

- 单元测试：`<domain>.<role>.test.ts`
- 集成测试：`<domain>.<role>.int.test.ts`
- 端到端测试：`<domain>.<role>.e2e.test.ts`

示例：

- `chat.controller.test.ts`
- `chat-stream.manager.int.test.ts`

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
- `marketplace-installed-cache.ts`（如果实现只有纯映射 / view updater，而没有缓存协调）

## 7. 渐进迁移策略

- 新增文件：必须立即遵循本规范。
- 存量文件：按“改动即治理”原则，在触达文件时顺带迁移命名。
- 大规模改名：按模块分批进行，避免一次性跨仓库重命名导致冲突。
