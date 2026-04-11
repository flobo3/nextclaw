# v0.15.95-kimi-coding-provider-support

## 迭代完成说明

- 为 NextClaw 增加原生 `kimi-coding` provider，使项目可以直接按 Kimi Coding 的接入方式发起请求，而不是再走“伪装成别的 coding agent 名字”的旁路。
- `@nextclaw/core` 新增 [`AnthropicMessagesProvider`](../../../packages/nextclaw-core/src/providers/anthropic/anthropic-messages.provider.ts)，把内部消息、tool schema、tool_use / tool_result 转成 Anthropic Messages 协议，并兼容 `https://api.kimi.com/coding` 与 `https://api.kimi.com/coding/v1` 两种 base URL 入口。
- 新协议实现最终落在 `providers/anthropic/` 子目录，而不是继续把 `providers/` 顶层目录摊平增长；这样既满足目录治理，也让协议 owner 边界更清晰。
- provider 规格增加 `apiProtocol` 与 `defaultHeaders` 元数据：
  - [`types.ts`](../../../packages/nextclaw-core/src/providers/types.ts)
  - [`litellm_provider.ts`](../../../packages/nextclaw-core/src/providers/litellm_provider.ts)
  - `LiteLLMProvider` 现在会按 provider spec 选择 `openai-compatible` 或 `anthropic-messages` 协议 owner，并合并 spec 默认 headers 与用户自定义 headers。
- `@nextclaw/runtime` 新增 [`kimi-coding.provider.ts`](../../../packages/nextclaw-runtime/src/providers/plugins/kimi-coding.provider.ts)，把 Kimi Coding 作为内建 provider 暴露：
  - `name: "kimi-coding"`
  - `defaultApiBase: "https://api.kimi.com/coding"`
  - `defaultModel: "kimi-coding/kimi-for-coding"`
  - `defaultHeaders.User-Agent = "claude-code/0.1.0"`
- `@nextclaw/server` 与 `@nextclaw/ui` 已补齐元数据和配置链路：
  - [`config.ts`](../../../packages/nextclaw-server/src/ui/config.ts) 把 `kimi-coding` 纳入 provider 展示顺序
  - [`router.provider-test.test.ts`](../../../packages/nextclaw-server/src/ui/router.provider-test.test.ts) 覆盖 provider meta 暴露
  - [`router-provider-probe.test.ts`](../../../packages/nextclaw-server/src/ui/router-provider-probe.test.ts) 单独覆盖 provider probe 时 `maxTokens >= 16` 的约束，避免继续把旧测试热点文件做大
  - [`ProviderForm.tsx`](../../../packages/nextclaw-ui/src/components/config/ProviderForm.tsx) 修正 custom provider 的 `wireApi` 支持判定，避免 UI 把 custom provider 当成“不支持 wireApi”
- 这轮还顺手修了一个阻塞验证的既有类型错误：
  - [`installed.ts`](../../../packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts) 现在会先过滤掉 `undefined` 的 record id，再构造 `Set<string>`，使 `pnpm -C packages/nextclaw-server tsc` 恢复通过。
- 本次方案文档沉淀在：
  - [`2026-04-11-kimi-coding-provider-implementation-plan.md`](../../plans/2026-04-11-kimi-coding-provider-implementation-plan.md)

## 测试/验证/验收方式

- 已执行：`pnpm -C packages/nextclaw-core test -- run src/providers/anthropic/anthropic-messages.provider.test.ts src/providers/litellm_provider.test.ts src/config/schema.provider-routing.test.ts`
  - 结果：通过，`3` 个测试文件、`12` 个测试全部通过。
- 已执行：`pnpm -C packages/nextclaw-server test -- run src/ui/router.provider-test.test.ts src/ui/router-provider-probe.test.ts`
  - 结果：通过，`2` 个测试文件、`16` 个测试全部通过。
- 已执行：`pnpm -C packages/nextclaw-core tsc`
  - 结果：通过。
- 已执行：`pnpm -C packages/nextclaw-runtime tsc`
  - 结果：通过。
- 已执行：`pnpm -C packages/nextclaw-ui tsc`
  - 结果：通过。
- 已执行：`pnpm -C packages/nextclaw-server tsc`
  - 结果：通过。
- 已执行：`node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths ...`
  - 结果：通过；本次 Kimi Coding 相关文件没有新的 maintainability error，仅剩仓库既有热点 warning。
- 已执行：`node scripts/lint-new-code-governance.mjs --paths ...`
  - 结果：通过；本次相关文件的命名、角色边界、class 方法箭头函数、context destructuring 等治理项均已通过。
- 已执行：`pnpm lint:maintainability:guard`
  - 结果：未完全通过。
  - 阻塞原因：当前工作区存在与本任务无关的新增文件 `apps/maintainability-console/scripts/dev.mjs`，它在根级 governance 的 `file-role-boundaries` 检查中报错；本次 Kimi Coding 相关文件已通过定向治理检查。
- 冒烟测试：
  - 暂未执行真实 Kimi 远端冒烟。
  - 原因：当前工作区没有可直接使用的 `KIMI_CODING_API_KEY`，无法对真实远端做非伪造请求；本次以协议映射测试、provider meta 测试与全链类型/守卫验证作为最小充分验收。

## 发布/部署方式

- 本次不涉及数据库迁移、服务端迁移脚本或额外部署基础设施。
- 发布后用户只需在 provider 配置里新增或选择 `Kimi Coding`，填入 `KIMI_CODING_API_KEY` 即可。
- 若用户已有自定义 base URL，需要保持 Anthropic Messages 兼容入口；默认推荐直接使用 `https://api.kimi.com/coding`。
- 若 UI 服务正在运行，发布新版本后重新启动前后端即可让新的 provider catalog 与表单逻辑生效。

## 用户/产品视角的验收步骤

1. 打开 NextClaw 配置中心的 provider 页面。
2. 确认 provider 列表中能看到 `Kimi Coding`，并且默认 base URL 显示为 `https://api.kimi.com/coding`。
3. 进入 `Kimi Coding` 配置页，填入有效的 `KIMI_CODING_API_KEY`。
4. 确认默认模型为 `kimi-coding/kimi-for-coding`，保存配置。
5. 若使用自定义 provider，也确认 `wireApi` 选项仍可见，说明 custom provider 的判定链路没有被这次改动破坏。
6. 发起一次需要 coding 模型的会话，请求应走 `kimi-coding` provider，而不是被错误路由到其它 OpenAI-compatible provider。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。本次没有做“名字伪装”或把 Kimi 特判塞进已有 OpenAI provider，而是补了独立协议 owner class 与 provider spec 元信息，避免继续让多协议判断散落在运行链路里。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。虽然这是新增能力，总代码净增长不可避免，但已经避免走 Claude/Codex 插件链路的补丁式方案，也顺手修掉了 server 里阻塞类型检查的 `Set<string | undefined>` 历史错误。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：部分做到。总代码与文件数因为新增 provider 能力而上升，但协议适配与 provider catalog 责任边界更清晰，没有把 Kimi 支持继续叠加到现有热点函数里；同时新增的 Anthropics 协议实现已收进 `providers/anthropic/` 子目录，避免继续让 `providers/` 顶层目录平铺增长。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。`AnthropicMessagesProvider` 负责协议转换和请求发送，`LiteLLMProvider` 只负责根据 provider spec 选路，runtime provider plugin 只负责 catalog 元数据，UI 只补齐配置面板与元数据暴露。
- 目录结构与文件组织是否满足当前项目治理要求：部分满足。`packages/nextclaw-server/src/ui/config.ts` 与 `packages/nextclaw-ui/src/components/config/ProviderForm.tsx` 仍是历史热点；本次已经把新的 Anthropics 协议实现下沉到独立子目录，并补齐热点债务说明，但下一步仍应继续拆分。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是。以下结论基于实现完成后的独立复核，而不是只复述 test / tsc / guard 输出。

可维护性复核结论：保留债务经说明接受

本次顺手减债：是

长期目标对齐 / 可维护性推进：
- 这次改动顺着 NextClaw “统一入口、统一能力编排”的长期方向推进了一小步。用户不需要再通过 Roo Code / OpenCode 的兼容壳去碰运气，而是能在 NextClaw 里直接声明一个真正的 `kimi-coding` provider。
- 这次没有把协议差异继续埋进一个越来越胖的通用 provider，而是明确补出 `anthropic-messages` 协议 owner，属于“边界更清晰，而不是把复杂度换个位置藏起来”。
- 下一步最值得继续推进的 seam，是继续把 `config.ts` 与 `ProviderForm.tsx` 的热点职责往更窄的域边界里拆，让 provider 支持扩展不再依赖大文件增量修改。

代码增减报告：
- 说明：以下统计按本次实现文件计算，不包含本 README。
- 新增：990 行
- 删除：119 行
- 净增：+871 行

非测试代码增减报告：
- 说明：以下统计按本次实现文件计算，并排除 `*.test.*` 文件，不包含本 README。
- 新增：670 行
- 删除：77 行
- 净增：+593 行

可维护性 finding 1：
- [`packages/nextclaw-ui/src/components/config/ProviderForm.tsx`](../../../packages/nextclaw-ui/src/components/config/ProviderForm.tsx) 仍是超预算热点文件，本次虽然没有继续把它明显做大，但它依然同时承担表单状态、认证流程和提交编排。
- 这会持续抬高 provider 配置面的修改成本，也让后续再接入新的 provider 字段时更容易触发预算回归。
- 更小更简单的修正方向：继续把 auth flow、wireApi / header normalization 和 submit patch 计算下沉到独立 hook 或 adapter。

可维护性 finding 2：
- [`packages/nextclaw-server/src/ui/config.ts`](../../../packages/nextclaw-server/src/ui/config.ts) 仍是 server UI 配置聚合热点。
- 这次只增加了 provider 排序项，没有扩展更多逻辑分支，但后续如果继续往这里堆 provider-specific 视图拼装，热点会继续恶化。
- 更小更简单的修正方向：按 provider / session / search 等域继续拆分配置构建逻辑，让 `config.ts` 退回装配层。

可维护性总结：
- 这次新增能力的净增长基本都落在真正需要的新协议 owner、provider spec 和测试上，没有通过伪装入口制造隐藏行为；同时还顺手把 provider probe 断言从旧热点测试文件中拆出。保留的债务主要是既有热点文件以及根级 guard 仍会被其它并行改动阻塞，就当前任务范围而言，增长已经压到最小必要，下一步应优先继续拆 `ProviderForm` 和 `config.ts` 两个热点边界。

## 红区触达与减债记录

### packages/nextclaw-server/src/ui/config.ts
- 本次是否减债：否，未新增债务但也未实质减债
- 说明：本次只在 provider 顺序中挂入 `kimi-coding`，没有把新的 provider 视图构建、patch 写回或业务逻辑继续堆进 `config.ts`，因此没有让热点继续变坏；但该文件仍是历史聚合热点，本轮没有跨 scope 去做结构拆分。
- 下一步拆分缝：先按 chat/session/provider 三个域拆分配置构建与默认值归一化。

### packages/nextclaw-ui/src/components/config/ProviderForm.tsx
- 本次是否减债：是，局部减债
- 说明：修复 custom provider `wireApi` 判定时，没有继续引入新的 section 或 effect 分支，而是通过复用既有 `supportsWireApi` 判断收口多处判定，并顺手把新增的派生文案内联，避免热点函数指标继续恶化。
- 下一步拆分缝：先拆 form state hook、auth flow hook、field sections、submit adapter。
