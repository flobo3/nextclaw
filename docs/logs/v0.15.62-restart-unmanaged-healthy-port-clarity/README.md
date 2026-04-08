# v0.15.62-restart-unmanaged-healthy-port-clarity

## 迭代完成说明（改了什么）

本次迭代修复了 `nextclaw restart` 在“目标 UI 端口上已经有健康服务，但当前 `service.json` 没有把它认成受管实例”时的误导性行为。

- 根因不是 `restart` 真把“旧服务杀失败”了，而是它原本只会停止 `service.json` 里记录且 PID 仍存活的受管后台进程。
- 当 `55667` 上其实已经有一个健康的 NextClaw 在响应，但这个监听者来自 Docker 或其它外部启动方式时，旧逻辑会先输出 `No running service found. Starting a new service.`，随后又在端口预检阶段报 `EADDRINUSE`，形成前后语义打架。
- 这次把“端口占用探测 / 健康探测 / 非受管健康实例识别”从 [service.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts) 抽到独立文件 [service-port-probe.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/runtime/service-port-probe.ts)，避免继续把探测 IO 逻辑堆进生命周期总控文件。
- [runtime.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime.ts) 的 `restart` 现在会在“没有受管运行态”时先判断目标端口上是否已经有健康但非受管的 NextClaw；若是，则直接给出明确错误：
  - 当前端口已有健康实例；
  - 但它不在当前 `service.json` 管理之下；
  - `restart` 不会偷偷去杀 Docker 或其它外部监听者；
  - 需要先停掉外部服务，或改用 `--ui-port <port>`。
- 同时保留并增强 `start` 侧端口预检文案，避免用户再次看到“像是应该能自动重启，但实际上并不能”的误导提示。
- 补充定向测试 [service-port-probe.test.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/runtime/tests/service-port-probe.test.ts)，覆盖：
  - 目标端口已有健康但非受管实例时返回明确提示；
  - 目标端口被占但并非健康 NextClaw 时不误判为受管冲突。

## 测试 / 验证 / 验收方式

- 定向单测：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw exec vitest run src/cli/commands/service-support/runtime/tests/service-port-probe.test.ts`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
- 真实 CLI 冒烟（隔离 `NEXTCLAW_HOME`，复现“非受管健康实例占住 55667”）：
  - `PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME=/tmp/... pnpm -C packages/nextclaw exec tsx src/cli/index.ts restart`
  - 观察点：不再先输出 `No running service found. Starting a new service.`，而是直接输出“目标端口已被健康但非受管实例占用”的明确信息。
- 结果摘要：
  - 上述单测、`tsc`、maintainability guard 已通过。
  - 冲突路径真实冒烟已通过，输出符合预期。
  - 额外尝试了“隔离环境下 `start -> restart -> stop`”的受管链路冒烟，但仓库当前 dev/tsx 启动链路会先命中既有 `ERR_PACKAGE_PATH_NOT_EXPORTED`（`tsx` 子路径导出问题），因此该条未作为本次修复的通过前提。

## 发布 / 部署方式

- 本次尚未执行正式发布。
- 若要让全局 `nextclaw` 用户立刻拿到修复，需要把包含本次改动的 `packages/nextclaw` 构建并发布到对应安装来源。
- 若仅在仓库内验证，可继续使用本地源码入口或后续构建产物进行回归。

## 用户 / 产品视角的验收步骤

1. 保持 `55667` 上已有一个健康的 NextClaw 实例，但不要让它出现在当前 `NEXTCLAW_HOME/run/service.json` 管理中。
2. 在另一个 `NEXTCLAW_HOME` 或缺少该实例 state 的环境里运行 `nextclaw restart`。
3. 确认 CLI 不再先说“没在运行，准备启动”。
4. 确认 CLI 直接提示：
   - 目标健康地址；
   - 当前实例不受本地 `service.json` 管理；
   - `restart` 不会自动杀 Docker/外部监听；
   - 下一步应停掉外部服务或改用 `--ui-port <port>`。
5. 在没有冲突的空闲端口环境下继续执行 `nextclaw start --ui-port <free-port>`，确认正常启动路径未被本次提示收敛逻辑破坏。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 这次修复顺着“统一入口必须足够可预测、足够可靠”的方向推进了一小步。`restart` 不再制造“看起来像自己会处理旧实例，实际上却在后一步翻车”的体验，用户更容易理解当前由谁在管理服务。
- 是否已尽最大努力优化可维护性：
  - 是。本次没有给 `restart` 增加“看到健康端口就强杀未知监听者”的隐藏兜底，而是坚持显式识别与显式报错；同时把端口/健康探测拆进独立 support 文件，避免继续扩大 [service.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts) 的职责面。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：
  - 是。这是非新增用户能力的修复，本次总代码净减少；核心做法是把重复的探测逻辑下沉复用，并删除 [service.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts) 里原本分散的底层探测实现，而不是继续在 `restart` 外面补一层 if/else 文案。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：
  - 是。总代码净减，`service.ts` 从 952 行降到 826 行，`runtime.ts` 也较变更前略降；虽然新增了一个 support 文件和一个测试文件，但它们换来了超大文件的职责收敛，没有继续恶化根目录平铺。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：
  - 是。端口探测与健康探测本质上属于 runtime IO support，而不是 `ServiceCommands` 的核心 orchestration 职责；现在边界比“所有逻辑都塞在 service/runtime 两个大文件里”更清晰，也没有引入多余层级。
- 目录结构与文件组织是否满足当前项目治理要求：
  - 部分满足。本次新增文件落在现有 [service-support/runtime](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service-support/runtime) 子目录与其 `tests` 子目录，没有继续把 [packages/nextclaw/src/cli/commands](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands) 根目录铺平；但仓库仍保留既有的 `cli` / `service.ts` 大文件 warning，后续仍应继续沿“按运行时支撑职责继续拆分”推进。
- 独立于实现阶段的可维护性复核：
  - 可维护性复核结论：通过
  - 本次顺手减债：是
  - 代码增减报告：
    - 新增：52 行
    - 删除：165 行
    - 净增：-113 行
  - 非测试代码增减报告：
    - 新增：52 行
    - 删除：165 行
    - 净增：-113 行
  - no maintainability findings
  - 可维护性总结：
    - 这次修复让行为更可预测，也顺手把低层探测逻辑从超大 orchestration 文件里抽离出来，属于“修 bug 的同时减债”。
    - 没有保留会偷偷接管外部进程的惊喜兜底，剩余复杂度主要仍集中在历史形成的 `runtime.ts` 与 `service.ts` 主链路里。
    - 下一步最值得继续推进的 seam 是把 `runtime.ts` 里与后台服务生命周期相关的判断进一步下沉，避免 CLI 入口继续承担过多编排细节。
