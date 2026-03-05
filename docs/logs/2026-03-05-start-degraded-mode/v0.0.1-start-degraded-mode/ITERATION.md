# Iteration v0.0.1-start-degraded-mode

## 1) 迭代完成说明（改了什么）
- 为 `nextclaw start` / `nextclaw restart` 增加 `--start-timeout <ms>` 参数。
- 后台启动就绪等待改为“总超时”模型：
  - 默认总超时：Windows 28s，macOS/Linux 33s。
  - 也可通过 `NEXTCLAW_START_TIMEOUT_MS` 环境变量覆盖。
- 当超时后进程仍存活时，不再立即杀进程；改为标记为 `degraded` 并保留运行态。
- 启动阶段日志前置：在 `${NEXTCLAW_HOME}/logs/service.log` 追加 `[startup]` 阶段日志（请求、spawn、探测阶段、降级/失败结果）。
- `status/doctor` 诊断链路对 `degraded` 启动状态给出更明确的问题与建议。

## 2) 测试/验证/验收方式
- 工程验证：`pnpm build && pnpm lint && pnpm tsc`。
- 本地冒烟：
  - 隔离目录运行 `node packages/nextclaw/dist/cli/index.js start --ui-port <port> --start-timeout <ms>`。
  - 验证 `curl http://127.0.0.1:<port>/api/health`。
  - 验证 `status --json` 输出与 `service.log` 的 `[startup]` 分段日志。
- VPS 冒烟：
  - 在测试机执行 `nextclaw start --start-timeout <ms>`。
  - 验证本地与公网 health、`status --json`、`doctor --json`。

## 3) 发布/部署方式
- 按项目发布流程执行 changeset/version/publish（如需发布）。
- 升级后执行：
  - `nextclaw stop`
  - `nextclaw start --start-timeout 45000`
  - `nextclaw status --json`

## 4) 用户/产品视角的验收步骤
1. 在机器执行：`nextclaw start --start-timeout 45000`
2. 预期：命令不再因 8s 探测失败而直接退出。
3. 执行：`nextclaw status --json`
4. 预期：若健康已就绪，`level=healthy`；若仍未就绪但进程存活，显示降级提示而非“直接失败停机”。
5. 检查日志：`~/.nextclaw/logs/service.log`
6. 预期：可看到 `[startup]` 阶段日志，便于定位卡点。
