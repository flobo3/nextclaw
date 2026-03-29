# v0.14.282-maintainability-report-deferred-feishu

## 迭代完成说明

- 为统一 maintainability report 新增显式的“延后治理 scope”配置文件 `scripts/maintainability-report-scope.mjs`。
- 将 `packages/extensions/nextclaw-channel-plugin-feishu` 标记为报告级延后治理 workspace，并写明排除原因：非核心渠道插件、近期更新频率较低，当前优先治理核心运行链路。
- 更新 `scripts/eslint-maintainability-report.mjs`：
  - 统一报告的 `lintTargets` 与 `directoryBudget` 扫描范围会跳过被标记为延后治理的 workspace。
  - 报告输出新增 `Deferred maintainability workspaces` 分段，显式展示被排除的 workspace 及原因。
  - coverage gap 统计也改为遵循相同 scope，避免出现“已声明延后治理却仍被 coverage 计为缺口”的不一致行为。
- 新增 `scripts/maintainability-report-scope.test.mjs`，覆盖延后治理 workspace 的精确匹配、子路径匹配与非匹配场景。

## 测试/验证/验收方式

- 运行单元测试：
  - `node --test scripts/maintainability-report-scope.test.mjs`
- 运行统一可维护性报告：
  - `node scripts/eslint-maintainability-report.mjs --json`
  - `node scripts/eslint-maintainability-report.mjs --fail-on-coverage-gaps`
- 验证点：
  - 报告中出现 `Deferred maintainability workspaces` 分段。
  - `packages/extensions/nextclaw-channel-plugin-feishu` 不再出现在 `violationsByWorkspace` 与 `directoryBudget.hotspots` 中。
  - `deferredWorkspaces` 中能看到飞书包及其排除原因。
  - `Coverage gaps` 保持 `0`，不会因 deferred scope 产生伪缺口。

## 发布/部署方式

- 本次变更只涉及仓库治理脚本、测试与迭代文档，无线上部署动作。
- 后续随正常版本发布即可，不涉及 migration、服务部署或静态资源发布。

## 用户/产品视角的验收步骤

- 在仓库根目录运行 `node scripts/eslint-maintainability-report.mjs --fail-on-coverage-gaps`。
- 确认报告头部显示 `Deferred workspaces: 1`。
- 确认报告中有 `Deferred maintainability workspaces:`，并列出 `packages/extensions/nextclaw-channel-plugin-feishu` 与排除原因。
- 确认主汇总中的 top workspace 与 top directory hotspots 已不再包含飞书渠道插件。
- 如后续需要恢复治理，只需移除 `scripts/maintainability-report-scope.mjs` 中对应条目，再重新运行报告。
