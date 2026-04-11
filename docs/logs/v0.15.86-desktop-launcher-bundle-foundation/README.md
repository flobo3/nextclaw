# v0.15.86-desktop-launcher-bundle-foundation

## 迭代完成说明

- 桌面端启动主链路已从“固定依赖打包内 runtime”推进到“优先解析 active product bundle”，并把 bundle source、legacy source、环境变量覆盖三种来源显式区分开。
- 已删除旧的 [updater.ts](/Users/peiwang/Projects/nextbot/apps/desktop/src/updater.ts)，不再把 `electron-updater` 视为桌面端免下载更新的主合同。
- 已新增 launcher 基础层并收拢到 [apps/desktop/src/launcher](/Users/peiwang/Projects/nextbot/apps/desktop/src/launcher)，当前包含：
  - bundle 目录与 pointer/state 管理
  - bundle manifest 解析
  - active bundle 解析与本地 bundle 安装
  - candidate 激活、健康确认、自动回滚
  - update manifest 解析
  - 远端 bundle 下载与 SHA-256 完整性校验
- 在收到“角色优先于领域、不要发明假角色、不要保留无意义 barrel”的反馈后，launcher 目录最终收敛为三层稳定角色：
  - `services/`：`bundle.service.ts`、`bundle-lifecycle.service.ts`、`update.service.ts`
  - `stores/`：`bundle-layout.store.ts`、`launcher-state.store.ts`
  - `utils/`：`bundle-manifest.utils.ts`、`update-manifest.utils.ts`、`version.utils.ts`
- 已删除 launcher 内所有 `index.ts` barrel，`main.ts` 与 `runtime-config.ts` 都直接依赖真实文件路径，不再增加中转层。
- 已把这轮目录治理经验沉淀为 skill：
  - [role-first-file-organization](/Users/peiwang/Projects/nextbot/.agents/skills/role-first-file-organization/SKILL.md)
- `main.ts` 现在会在桌面启动前先处理 pending candidate：第一次允许 candidate 启动一次；如果该 candidate 已启动过但未被标记健康，则下次启动前自动回滚到上一已知健康版本。
- 技术方案见：
  - [2026-04-11-desktop-no-download-update-architecture-design](../../plans/2026-04-11-desktop-no-download-update-architecture-design.md)
  - [2026-04-11-desktop-no-download-update-phase1-implementation-plan](../../plans/2026-04-11-desktop-no-download-update-phase1-implementation-plan.md)

## 测试/验证/验收方式

- 已执行：`pnpm -C apps/desktop tsc`
  - 结果：通过
- 已执行：`pnpm -C apps/desktop lint`
  - 结果：通过
- 已执行：`pnpm -C apps/desktop build:main && node --test apps/desktop/dist/**/*.test.js`
  - 结果：通过，`20 passed / 20 total`
- 已执行：`pnpm lint:maintainability:guard`
  - 结果：本次桌面端新增的 `apps/desktop/src` 目录预算问题已通过把 launcher 基础层收进子目录解决；命令最终仍失败，但失败来源来自当前工作区其它既有/并行链路，不属于本次桌面端新增问题，主要包括：
    - `packages/nextclaw-core/src/providers/openai_provider.ts`
    - `packages/nextclaw/src/cli/commands/ncp/runtime/nextclaw-ncp-runner.ts`
    - `packages/nextclaw/src/cli/runtime.ts`
- 已尝试执行：`python3 /Users/peiwang/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/role-first-file-organization`
  - 结果：未通过，失败原因不是 skill 本身，而是当前本机 Python 环境缺少 `yaml` 模块，报错 `ModuleNotFoundError: No module named 'yaml'`

## 发布/部署方式

- 本次只完成桌面端 launcher 基础层，不涉及数据库、远程 migration 或生产环境部署。
- 若要随桌面包发版，按现有桌面构建链路执行 `pnpm -C apps/desktop build:main` 后继续现有 Electron 打包流程即可。
- 当前已实现远端 update manifest 解析、版本比较、bundle 下载与 SHA-256 校验，但尚未实现 archive 解压安装、签名校验与 CI 发布整合，因此这次不能单独作为“完整应用内更新功能已上线”的发布节点；它是后续 Phase 1 远端更新链路的基础版本。

## 用户/产品视角的验收步骤

1. 在桌面端数据目录下准备一个合法的 product bundle，并把 `current.json` 指向该版本。
2. 启动桌面端，确认日志里会打印 `Runtime source: bundle`，且应用能正常拉起该 bundle 内的 runtime。
3. 将一个新版本 bundle 激活为 candidate 后重启桌面端，确认第一次会尝试启动 candidate，而不是在启动前被错误回滚。
4. 让该 candidate 在首次启动后被标记健康，确认后续再次重启时不会触发回滚。
5. 模拟 candidate 启动失败且未完成健康确认，再次启动桌面端，确认 launcher 会在启动前自动回滚到上一已知健康版本。
6. 提供一份匹配当前平台/架构的远端 update manifest，确认桌面端能识别出 `bundle-update` 或 `launcher-update-required`。
7. 下载 manifest 指向的 bundle archive，确认 staging 中生成新文件，且下载后的 SHA-256 与 manifest 一致。

## 可维护性总结汇总

- 可维护性复核结论：保留债务经说明接受
- 长期目标对齐 / 可维护性推进：本次顺着“桌面端产品版本单元统一、入口合同更单一、运行来源更可解释”的长期方向推进了一步。相比继续往旧 `electron-updater` 路径堆 patch，这次把 launcher 的职责边界先固定下来，后续再接下载、签名、CI 发布时不需要重新改启动合同。
- 本次是否已尽最大努力优化可维护性：是
- 是否优先遵循删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好：是。本次先删除旧的 [updater.ts](/Users/peiwang/Projects/nextbot/apps/desktop/src/updater.ts)，再删除所有无意义 `index.ts` barrel，并把 launcher 文件统一收敛成 `services / stores / utils` 三种稳定角色，而不是继续保留领域化假角色或额外中转层。
- 代码增减报告：
  - 统计口径：仅统计本次桌面端代码改动，不含 `docs/` 设计与迭代文档。
  - 新增：`1382` 行
  - 删除：`100` 行
  - 净增：`+1282` 行
- 非测试代码增减报告：
  - 统计口径：同上，但排除 `*.test.*`
  - 新增：`874` 行
  - 删除：`100` 行
  - 净增：`+774` 行
- 若总代码或非测试代码净增长，是否已做到最佳删减：当前已达到这一步的最佳实践最小值附近，但还保留一笔显式过渡债务：`legacy-runtime` 启动路径仍然存在。之所以暂不删除，是因为桌面端还没完成 seed bundle / 远端 bundle 下载链路，立刻删掉会让现有桌面包失去可启动性。等 Phase 1 的 bundle builder 与首包分发完成后，应优先删除这条 legacy 路径。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：部分达成。总代码量因新增 launcher 基础能力而上升，但桌面端根目录平铺度没有继续恶化，新增文件已集中到 [apps/desktop/src/launcher](/Users/peiwang/Projects/nextbot/apps/desktop/src/launcher)；同时旧 updater 代码已删除，没有形成“新旧两套更新器并存”。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰：是。`main.ts` 重新收缩为壳层协调；launcher 目录从“领域词容易冒充角色”的状态进一步收敛为 `services / stores / utils` 三层。编排落到 `service`，本地持久状态落到 `store`，manifest 解析与版本比较这类无状态逻辑落到 `utils`，角色语义现在可以直接从路径和文件名读出来。
- 是否避免了过度抽象或补丁式叠加：是。本次没有引入额外 framework 式抽象，也没有做 incident-specific fallback patch；唯一保留的 fallback 是 `legacy-runtime`，它被明确标注为临时迁移路径，并且没有进入 launcher 新合同内部。
- 目录结构与文件组织是否满足当前项目治理要求：当前桌面端链路已满足本次治理要求，`apps/desktop/src` 根目录文件数问题已通过子目录收敛消除，launcher 内也已删除所有无意义 barrel。后续若继续推进 update client / manifest / signer，应继续放在 `launcher/` 目录内，并优先复用现有 `services / stores / utils` 角色，避免重新把 `src` 根目录铺平或发明新的假角色。
- 本次可维护性评估是否基于独立于实现阶段的 review：是。本节基于实现完成后的独立复核，结合了构建、测试、维护性守卫结果与对启动合同/抽象边界的二次判断。
- no maintainability findings
- 可维护性总结：这次新增代码量不小，但它对应的是桌面端此前缺失的 launcher/update 基础能力，并且已经通过删除旧 updater、减少碎 class 数量、把 launcher 主逻辑收敛到两个核心对象来控制膨胀。当前最值得继续盯住的债务有两个：完成 archive 解压安装后尽快删掉 `legacy-runtime`，以及继续避免把远端更新链路重新拆回很多薄而碎的类。
