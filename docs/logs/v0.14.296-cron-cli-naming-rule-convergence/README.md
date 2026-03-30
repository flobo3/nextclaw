# v0.14.296-cron-cli-naming-rule-convergence

## 迭代完成说明（改了什么）

- 将 `nextclaw` CLI 的 cron 操作链路调整为“服务 API 优先 + 自动 bridge 鉴权 + 服务不可用回退本地文件”。
- 对本次新增文件按命名收口规则重构，统一为 `service/utils` 后缀：
  - `ui-bridge-api.client.ts` -> `ui-bridge-api.service.ts`
  - `cron-local.adapter.ts` -> `cron-local.service.ts`
  - `cron-job.view.ts` -> `cron-job.utils.ts`
- 沉淀全仓库命名约束，默认收口为四类后缀：`service/utils/types/test`。
- 更新规范文档：
  - `docs/workflows/file-naming-convention.md`
  - `AGENTS.md` 中 `file-name-must-match-primary-responsibility` 条目

## 测试/验证/验收方式

- 代码静态验证：
  - `pnpm -C packages/nextclaw exec eslint src/cli/commands/cron.ts src/cli/commands/cron/cron-local.service.ts src/cli/commands/cron/cron-job.utils.ts src/cli/commands/shared/ui-bridge-api.service.ts src/cli/runtime.ts src/cli/index.ts`
  - `pnpm -C packages/nextclaw exec tsc -p tsconfig.json`
- CLI/API 冒烟：
  - `nextclaw cron add -n "tmp-naming-rule-check" --at "2099-01-01T00:00:00Z" -m "noop"`
  - `nextclaw cron list --all`
  - `nextclaw cron remove <jobId>`
  - `curl -s "http://127.0.0.1:9808/api/cron?all=1"`，确认删除后 API 不再返回该任务
- 可维护性检查：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths ...`
  - 结果：无 error，仅历史目录/文件预算 warning

## 发布/部署方式

- 本次为源码与规范改造，按常规仓库流程提交并推送即可，无独立部署步骤。
- 若后续发版，按既有 release 流程（changeset/version/publish）进入发布批次。

## 用户/产品视角的验收步骤

1. 在本地启动 Nextclaw 服务并打开定时任务页面。
2. 用 CLI 创建一个临时 cron 任务并在前端页面确认可见。
3. 用 CLI 删除该任务，刷新前端页面后确认任务消失且不再“删除后回弹”。
4. 再次执行 `nextclaw cron list --all` 与页面比对，确认 CLI 与 UI 一致。

