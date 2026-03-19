# NextClaw Service-Native Remote Access Implementation Plan

## 目标

把 remote access 从前台 `nextclaw remote connect` 主路径，迁移到由 `nextclaw` 主服务统一托管的能力，并保持边界清晰、实现可插拔、后续扩展不膨胀。

## Phase 1: 配置与命令面收敛

### 目标

- 让用户主路径切换到：
  - `nextclaw login`
  - `nextclaw remote enable`
  - `nextclaw start`
- 为 remote 增加独立配置块与独立命令组

### 落地项

- 在主配置中新增 `remote.enabled / remote.deviceName / remote.platformApiBase / remote.autoReconnect`
- 新增 CLI：
  - `nextclaw remote enable`
  - `nextclaw remote disable`
  - `nextclaw remote status`
  - `nextclaw remote doctor`
- 保留 `nextclaw remote connect` 作为前台调试模式
- 更新使用文档与模板文档

### 验收标准

- 用户无需再把 `remote connect` 当作日常主入口
- `nextclaw --help` 与 `nextclaw remote --help` 能直接看到收敛后的命令面

## Phase 2: Service-Native Connector

### 目标

- 将 remote connector 并入现有 `start/serve/stop/status` 生命周期

### 落地项

- 新增 `RemoteServiceModule`
- 在 service host 启动 UI/API 后，根据 `config.remote.enabled` 自动启动 remote module
- 背景 service 启动时，把 remote 初始状态写入统一 service state
- foreground `serve` 同样复用 service-native remote module

### 验收标准

- `nextclaw remote enable && nextclaw start` 后，无需单独保持另一个终端窗口
- remote connector 会跟随主服务启动与停止

## Phase 3: 统一运行态状态源

### 目标

- 让 remote 状态进入已有 runtime truth，而不是另存一套影子状态

### 落地项

- 在 `service.json` 中加入 `remote` 运行态
- 增加 `RemoteStatusStore`
- `nextclaw status` 聚合输出 remote 启用状态、连接状态、设备名、平台、最近错误
- `nextclaw remote status` 读取同一状态源

### 验收标准

- `nextclaw status` 与 `nextclaw remote status` 对 remote 的判断一致
- 不需要第二份 remote runtime state 文件

## Phase 4: 安全与可维护性硬化

### 目标

- 解决当前 token 暴露和 remote 代码继续膨胀的风险

### 落地项

- 将完整 websocket token 从日志输出中移除，改为脱敏打印
- 将 remote 代码拆分为：
  - `RemoteConnector`
  - `RemoteServiceModule`
  - `RemoteStatusStore`
  - CLI facade
- 保持 server 只负责本地 UI/API 与 bridge，不复制 remote 业务逻辑

### 验收标准

- 日志中不再出现完整 ws token
- remote 相关代码职责边界清晰，不继续堆到单文件

## Phase 5: 后续增强预留

### 后续方向

- 平台 bearer token 升级为短期 relay ticket
- 更强的 remote doctor
- 平台设备页更完整的在线状态/最近错误展示
- 未来 relay provider 替换时，不影响 service host、UI router、CLI 主路径

## 本轮实施映射

本轮一次性落地了 Phase 1 到 Phase 4 的主干：

- 已完成 remote 配置模型
- 已完成命令面收敛
- 已完成 service-native connector
- 已完成 remote 状态并入 `nextclaw status`
- 已完成 token 日志脱敏

Phase 5 保留为后续增强，不阻塞当前长期主路径成立。
