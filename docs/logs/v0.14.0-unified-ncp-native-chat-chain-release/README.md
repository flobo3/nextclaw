# v0.14.0 Unified NCP Native Chat Chain Release

## 迭代完成说明

- 将最近一轮 NCP native chat chain、runtime 组装、会话存储适配、前端切换、thinking / reasoning / tool stream 修复、reply tag 清洗、占位卡片判定修复等改动统一纳入一次 minor 发布
- 将 marketplace skill metadata 文件统一能力一并纳入本次发布
- 本次发布的整体方向是：继续以 NCP 作为默认主链路推进，并冻结 legacy 链路新增功能，为后续彻底删除 legacy 做准备

## 测试/验证/验收方式

- `pnpm release:version`
- `pnpm release:publish`
- 发布前后补充确认：
  - `npm whoami`
  - `pnpm -C packages/nextclaw exec node dist/cli/index.js --help`

## 发布/部署方式

- 本次为 NPM 统一 minor 发布，按仓库既有流程执行：
  - 生成 unified minor changeset
  - `pnpm release:version`
  - 提交版本与 changelog 结果
  - `pnpm release:publish`
- 本次不涉及远程 migration，也不涉及 worker / pages / server 部署；这些项对本次 NPM 包发布不适用

## 用户/产品视角的验收步骤

1. 安装或升级最新发布的 `nextclaw`、`@nextclaw/ui`、`@nextclaw/server` 及相关 NCP 包
2. 打开默认聊天页，确认默认链路为 NCP，消息发送、停止、刷新历史、会话切换正常
3. 验证 reasoning / tool / reply tag / typing placeholder 等最近修复点不再回归
4. 如使用 marketplace skill 发布能力，确认 `marketplace.json` 元数据路径可正常参与 publish / update 流程
