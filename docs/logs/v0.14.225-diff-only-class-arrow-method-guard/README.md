# v0.14.225-diff-only-class-arrow-method-guard

## 迭代完成说明

- 新增 `scripts/lint-new-code-class-methods.mjs`，提供 diff-only 的 class 实例方法守卫。
- 守卫默认比较 `HEAD` 与当前工作区，仅检查 `apps`、`packages`、`workers` 下本次新增的 `ts/tsx/mts/cts` 代码。
- 仅对“新加的 class 普通实例方法”报错，要求使用 `method = () => {}` 形式；不会因为历史文件里的旧方法一次性报全仓噪音。
- 显式跳过 `constructor`、`get/set`、`static`、`abstract`、`override`、装饰器方法，降低误报。
- 在根 `package.json` 新增命令 `pnpm lint:new-code:class-methods`，便于本地、hook 或 CI 接入。

## 测试/验证/验收方式

- 运行 `node scripts/lint-new-code-class-methods.mjs --help`，确认帮助信息与参数说明正常输出。
- 运行 `pnpm lint:new-code:class-methods`，确认命令可执行，并在当前工作区真实命中新增 class 普通方法。
- 运行 `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths scripts/lint-new-code-class-methods.mjs package.json`，确认本次新增脚本未引入可维护性阻塞项。
- `build / lint / tsc` 本次不适用：改动仅为根级 Node 脚本与 `package.json` 命令入口，未触达受现有工作区编译链直接消费的业务源码；本次以命令级冒烟为最小充分验证。

## 发布/部署方式

- 本次无需单独发布或部署。
- 如需启用该守卫，可在本地直接运行 `pnpm lint:new-code:class-methods`。
- 如需接入自动化，可在 pre-commit、CI 或 PR gate 中调用同一命令；CI 场景可进一步使用脚本支持的 `--base <ref>` 参数。

## 用户/产品视角的验收步骤

- 作为仓库维护者，在包含新增 TypeScript class 方法的分支上运行 `pnpm lint:new-code:class-methods`。
- 若新增方法写成 `foo() {}`，命令应失败，并输出具体文件、行号、方法名。
- 若新增方法改成 `foo = () => {}`，或本次没有新增 class 普通方法，命令应通过。
- 历史未改动文件中的旧 class 方法不应因为本次接入而一次性产生全仓噪音。
