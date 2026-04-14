# v0.16.15-hermes-learning-loop-p0

## 迭代完成说明

本次实现了 Hermes learning loop 的 P0 第一阶段，但刻意保持为轻量实现，不新增新的后台 runner、skill 管理工具或额外存储层。

本轮实际落地的内容：

1. 在现有 prompt/skill context 体系中新增统一的 `Skill Learning Loop` 协议，要求 agent 在非平凡任务后先做简短复盘，再在 `no_skill_change / patch_existing_skill / create_new_skill` 三者中做明确判断。
2. 把“什么样的经验才值得升格成 skill”收敛成清晰标准：必须同时具备触发条件、可重复步骤、以及失败信号/检查点，避免把一次性事实或局部脏经验误沉淀成 skill。
3. 在 runtime user prompt 中同步注入轻量版学习协议，确保不只主 system prompt 知道这套规则。
4. 补齐 NCP context builder 对 `requested_skill_refs` 的透传，避免某些 runtime 只能按 skill name 工作，导致 skill 可见性不一致。
5. 为 NCP context builder 测试抽出一个轻量 test support 文件，顺手把测试文件重新压回预算以内。
6. 更新内建 `skill-creator` 指南，明确“由事后复盘生成 skill”时应该先抽取 trigger / workflow / failure checks，再决定是否真的新建 skill。

这次的重点不是“让 AI 学会怎么写文件”，而是先把“会不会主动复盘、会不会主动抽象、会不会正确判断是否 skill 化”做成产品默认协议。

## 测试 / 验证 / 验收方式

已完成：

1. `pnpm -C packages/nextclaw-core exec vitest run src/agent/tests/context.test.ts src/agent/tests/runtime-user-prompt.test.ts`
2. `pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/context/nextclaw-ncp-context-builder.test.ts`
3. `pnpm -C packages/nextclaw-core tsc`
4. `pnpm -C packages/nextclaw tsc`

结果：

1. 相关 Vitest 全部通过。
2. 相关 TypeScript 编译通过。

补充说明：

1. `pnpm lint:maintainability:guard` 已执行。
2. 该命令中的 diff-only governance 部分被工作区内其它既有未提交改动阻断，阻断项不属于本次改动本身；但 maintainability guard 本身已确认本次新增测试文件不再越过 file budget。

## 发布 / 部署方式

本次不涉及独立部署步骤。

若随正常版本发布进入产线，无需额外数据迁移；随常规 NextClaw 发布流程发布即可。

## 用户 / 产品视角的验收步骤

1. 发起一个需要技能或会形成稳定套路的非平凡任务。
2. 确认 agent 在 prompt 语义上已经具备“任务完成后主动复盘并判断是否应 skill 化”的默认约束，而不是只有用户点名才会总结。
3. 确认当用户或系统通过 `requested_skill_refs` 选择 skill 时，NCP prompt 里能保留对应 ref，而不是退化成只认名字。
4. 确认 skill 选择提示、active skills、available skills、learning loop 几块信息在相关 runtime prompt 中同时可见。

## 可维护性总结汇总

可维护性复核结论：通过

长期目标对齐 / 可维护性推进：

1. 本次顺着“代码更少、边界更清晰、优先补协议而不是补新系统”的方向推进了一小步。
2. 没有新增新的后台调度器、skill tool 或存储层，而是复用现有 prompt/context 边界完成第一阶段能力收敛。
3. 这符合 NextClaw 作为统一入口的长期方向：先让 agent 学会把经验抽象成可复用能力，再决定是否需要更重的运行时设施。

本次是否已尽最大努力优化可维护性：是。

是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。

1. 学习协议被收敛进现有 `skill-context` / `context builder` / `runtime user prompt` 边界，没有新增平行的 manager 或 service。
2. NCP 里原先重复的 requested skills 解析没有继续扩散，而是复用已有 `RequestedSkillsMetadataReader`。
3. 测试文件超预算后，没有放宽预算，而是拆出 test support，把主测试文件重新压回预算内。

代码增减报告：

1. 新增：204 行
2. 删除：132 行
3. 净增：+72 行

非测试代码增减报告：

1. 新增：49 行
2. 删除：29 行
3. 净增：+20 行

说明：

1. 净增主要来自统一的 `Skill Learning Loop` 协议文案，以及一小段 `skill-creator` 指南补充。
2. 为了控制增长，本次没有新增新的产品配置、后台执行器、数据库字段或独立 skill 管理接口。
3. 测试侧虽然新增了一个 support 文件，但同时删除了主测试文件里的重复夹具，整体测试复杂度比“继续往一个大测试文件里堆”更低。

抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰：

1. 是。
2. 学习协议集中在 `skill-context`，调用点分别落在 `ContextBuilder` 与 `RuntimeUserPromptBuilder`，边界清楚。
3. NCP 的 requested skill metadata 解析回收为已有 reader，避免又长出一套本地重复解析逻辑。

目录结构与文件组织是否满足当前项目治理要求：

1. 基本满足。
2. 本次新增了一个测试 support 文件，是为了解决既有测试文件越过预算的问题，属于减债而不是增债。

本次顺手减债：是。

no maintainability findings

可维护性总结：

1. 这次实现把 P0 收敛成“协议先行”的轻量版本，没有为了自动学习先造大系统，非测试代码净增控制在较小范围内。
2. 当前仍保留的债务主要是 `packages/nextclaw-core/src/agent/context.ts` 与 NCP context builder 本体接近预算，需要后续在更大范围重构时继续拆分。
3. 下一步最值得盯住的 seam 是：如果 P1/P2 继续做下去，学习协议与后台复盘调度仍应沿现有 `session_search / child session / session request` 语义扩展，避免重新长出第二套抽象。
