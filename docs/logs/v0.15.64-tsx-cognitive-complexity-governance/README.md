# v0.15.64-tsx-cognitive-complexity-governance

## 迭代完成说明

- 将 UI 组件文件集合 `uiComponentFiles` 正式纳入 `sonarjs/cognitive-complexity` 治理，避免 React / TSX 页面与组件长期处于认知复杂度真空区。
- 沿用现有编排重区的复杂度阈值 `18`，不再让 TSX 只受函数行数和语句数约束，而缺少“阅读与维护负担”维度的约束。
- 这样 `pnpm lint:maintainability:guard` 与基于 ESLint 的维护性报告在 TSX 被触达时，也能自动感知认知复杂度问题。

## 测试/验证/验收方式

- 已执行：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm exec eslint --print-config packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx | rg -n 'sonarjs/cognitive-complexity|max-lines-per-function|max-statements' -C 1`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm exec eslint packages/nextclaw-ui/src/components/chat/ChatConversationPanel.tsx`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm exec eslint packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/chat-message-file/index.tsx`
- 结果：
  - `print-config` 已显示 TSX 组件命中 `sonarjs/cognitive-complexity` 规则。
  - `ChatConversationPanel.tsx` 现在会报出 `Cognitive Complexity from 23 to the 18 allowed` warning。
  - `chat-message-file/index.tsx` 现在会报出 `Cognitive Complexity from 21 to the 18 allowed` warning。

## 发布/部署方式

- 本次未执行发布或部署。
- 原因：本次改动属于仓库治理规则收敛，不涉及用户明确要求的发布动作。

## 用户/产品视角的验收步骤

1. 运行 `pnpm exec eslint --print-config packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx`，确认 UI 组件配置中已包含 `sonarjs/cognitive-complexity`。
2. 对一个已知复杂的 TSX 组件运行 `pnpm exec eslint <path>`，确认输出会出现 `sonarjs/cognitive-complexity` warning。
3. 运行 `pnpm lint:maintainability:guard` 或按路径运行 `check-maintainability.mjs --paths <tsx-file>`，确认后续触达 TSX 组件时可进入统一维护性治理闭环。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。本次直接补齐治理缺口，没有再保留“TSX 先不管”的例外。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。这里不是新增新的自定义守卫或平行脚本，而是复用现有 ESLint + maintainability guard 主链，把 TSX 接回统一规则。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：基本满足。只增加了最小必要的规则配置与迭代留痕，没有引入新模块或新治理入口。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。复杂度治理继续收敛在既有 ESLint 配置层，避免把 React 组件治理额外拆成另一套机制。
- 目录结构与文件组织是否满足当前项目治理要求：满足。本次仅调整既有根级治理配置，并按规范新增单层迭代目录。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是。独立复核结论如下：

可维护性复核结论：通过

本次顺手减债：是

代码增减报告：

- 新增：5 行
- 删除：1 行
- 净增：+4 行

非测试代码增减报告：

- 新增：5 行
- 删除：1 行
- 净增：+4 行

- no maintainability findings
- 可维护性总结：这次改动没有新增平行治理入口，而是把 React / TSX 组件重新接回现有 ESLint 主链，属于最小必要净增。保留债务不是这次配置本身，而是已有若干 TSX 组件现在会被正式标成 complexity warning；这正是本次治理收口希望暴露出来的后续 paydown 入口。
