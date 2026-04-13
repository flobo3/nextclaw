# v0.16.5-desktop-update-kernel-version-label

## 迭代完成说明

- 将桌面更新页中 `desktopUpdatesCurrentBundleVersion` 的中文文案从“当前产品版本”调整为“当前内核版本”。
- 将对应英文文案从 `Current Product Version` 调整为 `Current Kernel Version`，让“桌面壳版本 / 内核运行版本”的页面心智更一致。
- 重新构建 `@nextclaw/ui` 并同步 `packages/nextclaw/ui-dist`，确保实际随产品分发的前端产物也带上新文案。

## 测试/验证/验收方式

- 已通过：`pnpm build:ui`
  - 结果：`@nextclaw/ui` 构建成功。
- 已通过：`node packages/nextclaw/scripts/copy-ui-dist.mjs`
  - 结果：最新 `dist` 已复制到 `packages/nextclaw/ui-dist`。
- 已通过：`pnpm lint:new-code:governance`
  - 结果：本次触达文件的增量治理检查全部通过。
- 已通过：`rg -n "当前内核版本|Current Kernel Version" packages/nextclaw/ui-dist`
  - 结果：打包产物中已包含新文案。

## 发布/部署方式

- 无需单独发布特殊补丁流程。
- 按既有前端/桌面端发布流程携带本次 `ui-dist` 变更即可。

## 用户/产品视角的验收步骤

1. 打开 NextClaw Desktop。
2. 进入设置页的“更新”模块。
3. 在“当前状态”卡片区确认仍能看到“桌面壳版本”“可用版本”“上次检查时间”等信息。
4. 确认原先显示“当前产品版本”的位置现在显示为“当前内核版本”。
5. 若切换英文界面，确认对应标签显示为 `Current Kernel Version`。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：本次顺着“术语更统一、页面语义更清晰、壳与内核边界更可解释”的方向推进了一小步，避免把运行 bundle 误表述成泛化的“产品版本”。
- 本次是否已尽最大努力优化可维护性：是。本次把改动限制在单一文案源，并复用既有构建同步链路，没有为了改名额外引入映射层、兼容逻辑或重复配置。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。实现上只替换既有标签文案，没有改 key、没有加分支、没有新增结构。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：是。源码层面仅一行文案替换；`ui-dist` 的差异主要来自重建后的产物 hash 变化，不代表新增业务复杂度。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。此次没有新增抽象层，仍由既有文案表统一承载桌面更新页标签。
- 目录结构与文件组织是否满足当前项目治理要求：满足。本次未新增代码目录或文件层级。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：不适用。本次仅涉及前端标签文案替换与构建产物同步，不涉及结构性代码调整，因此未单独执行 `post-edit-maintainability-review`。
