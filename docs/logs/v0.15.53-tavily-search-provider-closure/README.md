# v0.15.53 Tavily 搜索 Provider 闭环

## 迭代完成说明

- 针对 GitHub issue `#10` 提到的“原生支持 Tavily 和 EXA”需求，本批次先完整交付了 Tavily 搜索 provider 的全链路闭环，避免再次重复历史 PR `#7` 那种只改 runtime、没有补齐 config/UI/test 的半合并状态。
- `@nextclaw/core` 已将 Tavily 纳入搜索 schema 与运行时：
  - `search.provider` / `search.enabledProviders` 现在允许 `tavily`
  - 新增 `search.providers.tavily.apiKey`、`baseUrl`、`searchDepth`、`includeAnswer`
  - `web_search` 工具已支持直接调用 Tavily Search API，并在响应包含 `answer` 时把回答与结果列表一起格式化返回
- `packages/nextclaw-core/src/config/loader.ts` 已补齐 Tavily 迁移与保留逻辑，旧配置里写入的 `enabledProviders: ["tavily"]` 不会再在加载时被错误过滤掉。
- `@nextclaw/server` 已把搜索域从热点文件 [`config.ts`](../../../packages/nextclaw-server/src/ui/config.ts) 中部分拆出到 [`search-config.ts`](../../../packages/nextclaw-server/src/ui/search-config.ts)，并补齐：
  - Tavily 搜索 provider 元数据
  - Tavily 搜索配置视图构建
  - Tavily 搜索配置更新逻辑
  - 纯 patch 风格的配置写回，避免在普通函数里原地修改 `config`
- `@nextclaw/ui` 的搜索设置页不再是写死的 Bocha / Brave 二选一界面，现在能原生展示 Tavily，并支持配置：
  - API Key
  - API Base URL
  - Search Depth
  - Include Answer
- 搜索相关 UI 文案已从热点 [`i18n.ts`](../../../packages/nextclaw-ui/src/lib/i18n.ts) 抽出到 [`i18n.search.ts`](../../../packages/nextclaw-ui/src/lib/i18n.search.ts)，避免因为新增 Tavily 文案继续推高总字典文件。
- 文档已同步更新：
  - 新增实现方案文档 [`2026-04-08-tavily-search-provider-closure-plan.md`](../../plans/2026-04-08-tavily-search-provider-closure-plan.md)
  - 更新 [`docs/USAGE.md`](../../../docs/USAGE.md) 的搜索 provider 配置示例，加入 Tavily
- 本批次没有交付 EXA 集成。
  - 原因不是忽略需求，而是用户已明确表示“先把 tavily 给它集成进去”
  - 本次选择先把一个 provider 做成完整可用闭环，而不是同时留下第二个半成品接入口

## 测试/验证/验收方式

- Core 定向测试：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core test -- --run src/config/loader.nextclaw-provider.test.ts src/agent/tools/web.test.ts`
  - 结果：通过，覆盖 Tavily provider 的配置保留、API 调用参数与结果格式化
- Server 定向测试：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test -- --run src/ui/router.search-config.test.ts`
  - 结果：通过，覆盖 Tavily 搜索配置更新与 search metadata 暴露
- UI 定向测试：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/components/config/SearchConfig.test.tsx`
  - 结果：通过，覆盖 Tavily 字段渲染与提交 payload
- 类型检查：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core tsc`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server tsc`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
  - 结果：通过
- 定向构建：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core build`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server build`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
  - 结果：通过
- 定向 lint：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
  - 结果：通过；仅输出仓库既有 warning，未新增 error
- 可维护性守卫：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：未通过
  - 说明：
    - 本次相关的 `packages/nextclaw-server/src/ui/config.ts` 热点说明已在本 README 补齐，且搜索域已拆出到 `search-config.ts`
    - 本次新增的 `search-config.ts` 已改为纯 patch 风格，`web.ts` 也已补齐治理要求（class arrow method / 降低主流程认知复杂度），不再出现在守卫 error 清单中
    - 守卫当前剩余失败全部来自当前工作区里并行存在的其它未提交改动，例如 `packages/nextclaw-core/src/config/agent-profile-runtime-fields.ts`、`packages/nextclaw-server/src/ui/router.ts`、`packages/nextclaw-server/src/ui/ui-routes/ncp-session.controller.ts`、`packages/nextclaw/src/cli/commands/ncp/session-request/session-creation.service.ts` 的参数原地修改问题，不是本批 Tavily 搜索链路引入
- 冒烟测试：
  - 不适用
  - 原因：真实 Tavily 冒烟需要有效 `TAVILY_API_KEY` 或 `search.providers.tavily.apiKey`，本轮实现阶段尚未拿到可用密钥

## 发布/部署方式

- 本次未执行发布或部署。
- 若后续需要随前端/UI server 一起发布，不涉及数据库 migration 或远程部署专属步骤。
- 发布前只需确保使用有效 Tavily 凭证做一次真实冒烟：
  - 在配置里写入 `search.provider = "tavily"`
  - 将 `tavily` 加入 `search.enabledProviders`
  - 配置 `search.providers.tavily.apiKey`
  - 启动 NextClaw 后执行一次带 `web_search` 的真实请求，确认 Tavily 正常返回

## 用户/产品视角的验收步骤

1. 打开 NextClaw 的搜索设置页 `/search`。
2. 确认左侧 provider 列表中除了 `Bocha Search`、`Brave Search` 外，还能看到 `Tavily Search`。
3. 点击 `Tavily Search`，确认右侧详情页出现 `API 密钥`、`接口地址`、`搜索深度`、`包含回答` 四个 Tavily 专属配置项。
4. 将 Tavily 设为当前搜索 provider，并激活 Tavily。
5. 填入有效的 Tavily API Key，按需选择 `搜索深度 = 高级`、`包含回答 = 启用` 后保存。
6. 发起一次明确会触发网页搜索的任务，确认系统可正常走 Tavily 返回搜索结果。
7. 若开启 `包含回答`，确认结果中除了链接列表外，还能看到 Tavily 返回的回答摘要。
8. 重新刷新页面，确认 Tavily 的激活状态与配置项保持持久化，不会被 UI 或 loader 回退掉。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是，在当前任务范围内已做到最佳平衡。没有为了“顺手支持 EXA”再留下第二条半成品路径，而是集中把 Tavily 做成完整闭环；同时把 server 搜索域从热点 [`config.ts`](../../../packages/nextclaw-server/src/ui/config.ts) 中拆出到 [`search-config.ts`](../../../packages/nextclaw-server/src/ui/search-config.ts)，避免继续把 search 逻辑堆回总装配文件。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。最关键的删减不是删功能，而是删“半支持”的路线和继续堆在 `config.ts` 里的搜索分支；另外把新增搜索测试从超长的 [`router.provider-test.test.ts`](../../../packages/nextclaw-server/src/ui/router.provider-test.test.ts) 中移出，并把搜索文案拆到 [`i18n.search.ts`](../../../packages/nextclaw-ui/src/lib/i18n.search.ts)，避免继续加长旧热点文件。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：总代码量净增长，但属于新增用户可见能力所需的最小必要增长；同时通过把 search 域拆出热点文件，抵消了原本最糟糕的增长位置。新增文件数有增长，主要来自 Tavily 的独立测试与 `search-config.ts`，它们对应的是真实边界，而不是空心包装层。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。`core` 负责 schema/runtime，`server/ui/search-config.ts` 负责搜索配置的 view/meta/update，`ui/SearchConfig.tsx` 负责 Tavily 的用户配置表面，边界比“所有搜索逻辑都继续塞在 server 总配置文件里”更合理。
- 额外的治理收口：
  - `packages/nextclaw-core/src/agent/tools/web.ts` 已把实例方法改成箭头函数 class field，并把错误解析 / provider 归一化拆成 helper，避免继续让 `execute` 变成规则阻塞点。
  - `packages/nextclaw-server/src/ui/search-config.ts` 已采用纯函数式 patch 返回新配置，符合“行为明确、可预测”的治理方向。
- 目录结构与文件组织是否满足当前项目治理要求：部分满足。`packages/nextclaw-server/src/ui` 与 `packages/nextclaw-ui/src/components/config` 仍是历史上较平铺的目录，但本次新增文件对应真实领域边界，没有继续把搜索逻辑或测试硬塞进旧热点文件。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是，已基于实现完成后的独立复核填写。
  - 可维护性复核结论：保留债务经说明接受
  - 本次顺手减债：是
  - 长期目标对齐 / 可维护性推进：
    - 这次改动顺着“统一入口 + 统一体验”的长期方向前进了一小步，让 NextClaw 可以把 Tavily 作为原生搜索编排能力接入，而不是要求用户自己打补丁。
    - 同时也顺手把 `server` 侧的搜索配置域从总热点文件中抽出来，哪怕只是局部拆分，也比继续堆补丁更接近长期可维护方向。
  - 代码增减报告：
    - 新增：1201 行
    - 删除：359 行
    - 净增：+842 行
  - 非测试代码增减报告：
    - 新增：823 行
    - 删除：282 行
    - 净增：+541 行
  - 可维护性 finding 1：
    - [`packages/nextclaw-ui/src/components/config/SearchConfig.tsx`](../../../packages/nextclaw-ui/src/components/config/SearchConfig.tsx) 虽然已经拆掉主函数膨胀点，但整个文件仍接近预算上限。
    - 如果后续再接 EXA 或更多 provider，这里仍有继续变胖的风险。
    - 更小更简单的修正方向：把 provider 字段区块继续下沉到独立文件，并把 provider-specific state 归一化为更窄的数据结构。
  - 可维护性 finding 2：
    - [`packages/nextclaw-core/src/agent/tools/web.ts`](../../../packages/nextclaw-core/src/agent/tools/web.ts) 现在同时承载 Bocha / Tavily / Brave 三个 provider 的请求与归一化逻辑。
    - 再继续往里加 EXA，会把一个工具文件变成 provider dispatch 热点。
    - 更小更简单的修正方向：在确认第二个新增 provider 真要进入时，再把 provider-specific request/normalize 逻辑拆成独立 helper。
  - 可维护性总结：这次改动的净增长主要来自把 Tavily 从“想支持”变成“真的支持”，增长是合理且最小必要的；与此同时已经顺手完成了一次真实减债，把搜索域从 server 热点文件中部分拆出。仍需继续关注的下一步，是在支持 EXA 前先决定 `web.ts` 和 `SearchConfig.tsx` 是否要做第二轮边界拆分。

### hotspot-path

- 路径：[`packages/nextclaw-server/src/ui/config.ts`](../../../packages/nextclaw-server/src/ui/config.ts)
- 本次是否减债：是，局部减债
- 说明：本轮没有继续把 Tavily 的 metadata/view/update 分支直接叠加到 `config.ts`，而是新建 [`search-config.ts`](../../../packages/nextclaw-server/src/ui/search-config.ts) 承接搜索域逻辑，让 `config.ts` 回到更偏聚合装配的角色。
- 下一步拆分缝：继续把 provider / session / 其它 search 以外的配置域从 `config.ts` 拆出，让它逐步退回到纯聚合层。
