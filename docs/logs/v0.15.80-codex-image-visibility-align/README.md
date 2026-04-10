# 迭代完成说明

- 修复了 native 绘画图片在 NCP 会话里可见、但转到 Codex runtime 后被压成纯文本的问题。根因不是上传失败，而是 `@nextclaw/nextclaw-ncp-runtime-codex-sdk` 默认只读取最后一段文本，完全没有把用户消息里的图片部件转成 Codex SDK 支持的 `local_image` 输入。
- 把 Codex runtime 输入正式升级为 SDK 原生的 `string | UserInput[]`，让图片不再通过“资产说明文字”降级，而是通过本地文件路径直接进入 Codex。
- 把 UI agent 已有的 `assetStore.resolveContentPath()` 能力显式下传到 runtime factory，再传给 Codex plugin，补上了此前中途丢失的资产访问边界。
- 删除了插件内一份已经落后、且只会把附件写成文字说明的重复 `codex-input-builder.ts`，把输入构建逻辑收敛到 runtime 包共享实现里，避免两套 Codex 输入链路继续漂移。
- 顺手把 Codex runtime 主类拆出 `codex-input.utils.ts` 并把被触达的实例方法统一改成箭头 class field，避免为修复图片问题把运行时主文件继续堆胖。

# 测试/验证/验收方式

- 类型检查：
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-codex-sdk tsc`
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk tsc`
  - 结果：通过。
- 定向回归测试：
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/compat/codex-input-builder.test.ts`
  - 结果：通过，3/3 通过。
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/compat/codex-runtime-plugin-provider-routing.test.ts -t "passes asset path resolution into the codex input builder"`
  - 结果：通过，验证了 `resolveAssetContentPath -> inputBuilder -> local_image` 这条链路。
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/compat/codex-input-builder.test.ts src/cli/commands/compat/codex-runtime-plugin-provider-routing.test.ts -t "passes asset path resolution into the codex input builder|keeps plain text messages unchanged|includes file parts as asset reference text for codex prompts|emits local_image inputs when an uploaded image has a resolved local path"`
  - 结果：通过，4 条与本次问题直接相关的断言全部通过。
- 本次触达文件定向可维护性守卫：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-codex-sdk/src/index.ts packages/extensions/nextclaw-ncp-runtime-codex-sdk/src/codex-input.utils.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.ts packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend-types.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts packages/nextclaw/src/cli/commands/compat/codex-input-builder.test.ts packages/nextclaw/src/cli/commands/compat/codex-runtime-plugin-provider-routing.test.ts packages/nextclaw/tsconfig.json`
  - 结果：通过，无 error，保留若干 near-budget warning。
- 全仓守卫与全量相关检查：
  - `pnpm lint:maintainability:guard`
  - 结果：失败，但当前阻塞项是 `packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/lexical/chat-composer-lexical-adapter.ts` 的并行改动超预算，不是本次 Codex 图片修复引入。
  - `pnpm lint:new-code:governance`
  - 结果：失败，但失败点来自并行中的 `weixin-channel.ts` 与 `chat-composer-token-node.tsx` class-arrow 治理，不是本次触达的 Codex/NCP 文件。
  - `pnpm -C packages/nextclaw tsc --pretty false`
  - 结果：失败，但失败点是既有的 `packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts` `Set<string | undefined> -> Set<string>` 类型错误，与本次改动链路无关。

# 发布/部署方式

- 本次改动触达 runtime / plugin / UI NCP agent 装配链路，需要随下一次 NextClaw 桌面端或服务端构建一起带出。
- 若只做本地验证，至少需要重建 runtime 包：
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-codex-sdk build`
- 若要进入产品可用环境，按正常前端/桌面发布批次重建并发布包含 `packages/nextclaw` 与相关扩展包的产物即可；本次不涉及数据库、migration 或远程后端变更。

# 用户/产品视角的验收步骤

1. 在 native 绘画/图片输入入口创建或上传一张图片，确认聊天界面仍能正常预览。
2. 将这张图片发送到 Codex 会话，文本里直接问“你能看见这张图片吗？”。
3. 期望 Codex 明确确认看见图片，并给出图片内容层面的回答，而不是声称“我看不到附件”或完全忽略图片存在。
4. 继续追问一轮与图片内容相关的问题，确认同一线程里的 Codex 上下文没有退化回纯文本附件说明。
5. 再发送一个普通非图片附件，确认 Codex 仍只收到资产提示文字，没有因为这次修复把非图片文件错误当成图片输入。

# 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。修复问题时没有在现有文本 builder 外面再包一层 if/flag，而是直接把输入链路收敛到 runtime 共享实现，并删除插件侧重复 builder。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。先删掉了 117 行的重复 `codex-input-builder.ts`，再把图片输入转换与 runtime 主循环拆开，避免继续把主文件做成补丁堆。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：部分做到。插件目录文件数净减 1，但为了补上之前根本不存在的“图片 -> local_image -> 资产路径解析”正式链路，总代码与非测试代码仍有净增；这部分增长已压到共享 helper + 少量装配改动，没有新增第二套实现。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。现在运行时主类只负责线程生命周期与事件流，图片输入构建下沉到独立 helper；UI agent 只负责提供资产路径能力，不再让插件隐式猜测附件来源。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增的 [codex-input.utils.ts](../../../packages/extensions/nextclaw-ncp-runtime-codex-sdk/src/codex-input.utils.ts) 是把超预算主文件拆小后的结果；仍存在若干 near-budget warning，下一步入口主要在 [index.ts](../../../packages/extensions/nextclaw-ncp-runtime-codex-sdk/src/index.ts) 和 [create-ui-ncp-agent.ts](../../../packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts)。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已执行，以下结论基于一次独立复核与定向 guard，不只复述守卫输出。

可维护性复核结论：通过

本次顺手减债：是

长期目标对齐 / 可维护性推进：
- 这次改动顺着“统一入口 + 统一体验”的长期方向推进了一小步：用户已经能在 native 侧看到的图片，现在终于能以同样事实进入 Codex，而不是在统一入口里被中途丢失。
- 这次顺手推进的维护性改进是删掉插件内重复 builder，并把输入构建逻辑收敛到 runtime 共享 helper，减少未来再出现“一个 Codex 入口支持、另一个不支持”的能力漂移。
- 暂时没有继续下沉 `assetStore` 抽象到更通用 runtime API，是因为这次先以最小必要的 `resolveAssetContentPath` 明确能力边界；下一步若更多 runtime 需要同类能力，再考虑抽成共享资产访问接口。

代码增减报告：
- 新增：566 行
- 删除：274 行
- 净增：+292 行

非测试代码增减报告：
- 新增：468 行
- 删除：273 行
- 净增：+195 行

可维护性总结：
- no maintainability findings
- 这次虽然是 bug fix，但增长主要用于补上此前缺失的正式多模态输入链路，并不是继续叠加补丁；同时删除了 117 行重复 builder，把插件目录文件数压回少 1 个。
- 仍需关注的是 Codex runtime 与 UI NCP agent 两个入口文件已接近预算上限；如果未来继续扩这条链路，优先再把 runtime 生命周期发射与 UI agent 运行时装配拆成更细的职责块。
