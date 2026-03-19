# v0.14.79-service-native-remote-access-design

## 迭代完成说明

- 新增长期方案设计文档，明确 NextClaw remote access 的长期主线应从“前台 `remote connect` 命令”升级为“主服务内建 remote capability”。
- 文档重点给出：
  - Service-Native Remote Access 的总体架构
  - 可插拔但不过度抽象的模块边界
  - CLI 收敛方案
  - 配置模型
  - 生命周期设计
  - 认证与安全升级方向
  - 迁移路径与验收标准
- 设计文档：
  - [NextClaw Service-Native Remote Access Design](../../../docs/plans/2026-03-19-nextclaw-service-native-remote-design.md)

## 测试 / 验证 / 验收方式

- 文档结构检查：
  - 确认设计文档包含背景、目标、架构、模块边界、配置、命令收敛、生命周期、认证、安全、迁移路径、验收标准。
- 链接检查：
  - `README.md` 中的方案链接为 Markdown 相对链接，可正常引用到设计文档。
- 代码验证：
  - 不适用。本次仅新增长期设计文档与迭代留痕，未触达项目代码或运行链路。

## 发布 / 部署方式

- 不适用。本次无代码发布、无 npm 发布、无部署动作。

## 用户 / 产品视角的验收步骤

1. 阅读设计文档，确认长期主张已经收敛为“remote 并入主服务”，而不是继续维护独立前台 connector 主路径。
2. 确认可插拔边界只落在 relay、registry、ticket、forwarder 等变化点，没有把整个 remote 做成重量级插件系统。
3. 确认未来用户主路径已经定义为：
   - `nextclaw remote enable`
   - `nextclaw start`
   - `nextclaw remote status`
4. 确认文档中明确要求日志脱敏和短期 relay ticket，避免当前 token 直接暴露的问题继续存在。
