# 迭代完成说明

- 修复 `loadConfig` 在现有 `config.json` 解析/校验失败时仍回退默认配置并写回磁盘的问题；现在仅在配置文件缺失时才持久化默认配置，已有坏配置会保留原文件不再被静默覆盖。
- 新增回归测试，覆盖“已有无效配置文件不得被默认配置覆盖”的场景，避免旧版本运行时再次把用户配置抹掉。
- 处理本机运行态冲突：清理残留的全局 `nextclaw` 与旧开发实例，仅保留当前本地开发实例。
- 基于本机残留证据做了最小可证恢复：恢复 `search.provider = tavily`，并把微信渠道的 `defaultAccountId/baseUrl/allowFrom/accounts` 恢复回 `~/.nextclaw/config.json`；未发现可靠备份的 provider API key 未做臆测填充。

# 测试 / 验证 / 验收方式

- 运行 `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/core test -- src/config/loader.nextclaw-provider.test.ts src/config/loader.nextclaw-api-base-migration.test.ts`
- 运行 `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`
- 运行 `curl http://127.0.0.1:18793/api/health`
- 运行 `curl http://127.0.0.1:18793/api/config`
- 观察点：
  - `api/health` 返回 `ok`
  - `api/config` 返回的 `search.provider` 为 `tavily`
  - `api/config` 返回的 `channels.weixin` 含 `defaultAccountId/baseUrl/accounts`
  - 监听端口只剩当前开发实例 `18793`

# 发布 / 部署方式

- 本次先完成本地源码修复与本机运行态止血，不涉及生产部署。
- 若后续要把修复带到可安装 CLI，需要合并代码后发布包含 [loader.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/config/loader.ts) 的相关包链路。

# 用户 / 产品视角的验收步骤

1. 刷新本地开发前端对应页面，确认搜索配置里不再丢失 `Tavily`。
2. 打开渠道配置页，确认微信渠道不再是纯空白，能看到恢复出的账号与基础地址。
3. 再次修改一项配置并观察日志，确认不再出现“配置校验失败后被默认配置覆写”的行为。
4. 本地开发期间执行 `lsof -nP -iTCP -sTCP:LISTEN | rg ':(18792|18793|19331|9808)'`，确认只剩当前目标实例。

# 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。修复点收敛在单一加载器入口，没有新增旁路补丁或额外兼容分支。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。没有新增新模块或兜底层，只是在已有加载分支上增加一个“失败时不落盘”的约束，并用一条回归测试锁定。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：基本做到。总代码净增 `+22` 行，其中非测试代码净增 `+4` 行；增长来自必要的保护条件与回归测试，没有新增文件。目录平铺问题未继续恶化，但 `packages/nextclaw-core/src/config` 仍处于治理警告状态，本次未扩大。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。风险被压回 `loadConfig` 这一真实入口，没有把保护逻辑散落到 UI、service、dev runner 多处重复兜底。
- 目录结构与文件组织是否满足当前项目治理要求：部分满足。此次未新增目录债务；但 `packages/nextclaw-core/src/config` 目录文件数已超预算，当前守卫仍提示后续应按职责拆分。
- 独立于实现阶段的可维护性复核：
  - 可维护性复核结论：通过
  - 本次顺手减债：是
  - 代码增减报告：
    - 新增：25 行
    - 删除：3 行
    - 净增：+22 行
  - 非测试代码增减报告：
    - 新增：6 行
    - 删除：2 行
    - 净增：+4 行
  - no maintainability findings
  - 长期目标对齐 / 可维护性推进：本次把“坏配置被静默覆盖”这个高风险隐式副作用从核心加载路径里拿掉了一部分，系统行为更可预测了。剩余维护性观察点是 `packages/nextclaw-core/src/config` 目录仍偏平铺，后续若该目录继续增长，应顺手按加载/迁移/schema 责任拆分。
