# NextClaw 桌面端免手动下载更新 Phase 1 实施计划

> 基于 [桌面端免手动下载更新架构方案](./2026-04-11-desktop-no-download-update-architecture-design.md)。

**目标：** 在不依赖 Apple / Microsoft 平台签名的前提下，为 NextClaw Desktop 落地第一阶段的“免手动下载更新”主链路。Phase 1 只解决 **产品包更新**，不解决完整的 launcher 自更新。

**一句话结果：** 用户安装一次桌面端 launcher 后，后续版本更新通过应用内下载新的 `product bundle` 完成；升级后 UI、runtime、本地服务、内置插件一起切换；启动失败时自动回滚到上一版本。

**范围：**

- 覆盖 macOS / Windows / Linux 三个平台的统一产品更新心智
- 保留现有桌面安装物作为首次安装入口
- 新增 `launcher + versioned bundle + manifest/signature + switch/rollback`
- UI 必须纳入 product bundle
- 不做完整 launcher 自更新
- 不做 delta patch
- 不做多渠道复杂灰度体系，只保留 `stable`，最多预留一个内部渠道字段

---

## 1. Phase 1 交付定义

Phase 1 完成后，桌面端应满足以下体验：

1. 用户首次通过现有桌面安装物安装 launcher
2. launcher 首次运行时，能加载内置 seed bundle 或拉取首个 stable bundle
3. launcher 启动当前 bundle 内的 runtime，并显示当前 bundle 对应的 UI
4. launcher 在后台检查更新
5. 发现新版本后，下载对应平台/架构的 product bundle
6. 下载完成后校验 hash 与签名
7. 用户点击“重启更新”后切换到新 bundle
8. 新 bundle 启动成功，则标记为健康版本
9. 新 bundle 启动失败，则自动回滚到上一版本

**本阶段不要求：**

- launcher 自身也能应用内热更新
- 继续复用 `electron-updater`
- 操作系统级原生自动更新语义
- 静默无提示重启升级

---

## 2. 关键决策锁定

### 决策 1：`apps/desktop` 转型为 launcher

当前 `apps/desktop` 不废弃，直接转型为 launcher 宿主层。

它继续负责：

- BrowserWindow
- preload
- tray / auto-start
- launcher 状态管理
- bundle 检查 / 下载 / 切换 / 回滚
- 启动当前 bundle 的 runtime

它不再默认假设：

- `apps/desktop` 自己打出来的 Electron 包就是“唯一产品版本载体”

### 决策 2：UI 属于 bundle

Phase 1 明确要求：

- UI 必须打入 product bundle
- runtime 必须打入 product bundle
- 内置插件必须打入 product bundle

这意味着 bundle 是唯一可切换的产品版本单元。

### 决策 3：pointer file 优先，不依赖 symlink

本地当前版本记录统一使用状态文件，而不是依赖 symlink 作为主机制。  
原因：

- Windows 一致性更好
- 打包环境行为更可预测
- 回滚和坏版本隔离更容易建模

### 决策 4：签名采用产品自有信任链

Phase 1 更新安全基线：

- HTTPS
- SHA-256
- Ed25519 signature

launcher 内置公钥，CI 或发布流程生成私钥签名。

### 决策 5：保留现有首次安装路径

首装仍走：

- macOS：现有 desktop 安装物
- Windows：现有 desktop 安装物
- Linux：现有 desktop 安装物 / `.deb`

**Phase 1 的重点不是改首装，而是改后续产品版本更新机制。**

---

## 3. Phase 1 架构边界

### 3.1 Launcher 负责什么

- 读取本地 launcher state
- 决定当前 bundle 版本
- 拉取 update manifest
- 比较版本
- 下载 bundle
- 校验 bundle
- 解压 bundle
- 启动 bundle 内 runtime
- 判断 candidate 是否健康
- 切换 current / previous
- 回滚
- 记录日志与故障信息

### 3.2 Bundle 负责什么

- 提供 UI 资源
- 提供本地服务启动脚本
- 提供内置插件集合
- 声明自身 manifest
- 声明最低 launcher 兼容要求

### 3.3 暂不进入 Phase 1 的内容

- launcher 自更新 helper
- 差分更新
- 多渠道复杂灰度
- 插件 marketplace artifact 统一改造
- bundle 加密
- 远程 kill-switch / blocklist

---

## 4. 目标目录与模块拆分

### 4.1 `apps/desktop/src` 新增 / 重构模块

建议新增以下模块：

- `apps/desktop/src/launcher-state.ts`
  - 读取 / 写入 launcher 本地状态
- `apps/desktop/src/bundle-layout.ts`
  - 统一版本目录、staging、current、previous 路径计算
- `apps/desktop/src/bundle-manifest.ts`
  - bundle 内 manifest 解析与校验
- `apps/desktop/src/update-manifest.ts`
  - 远端更新清单结构与校验
- `apps/desktop/src/update-client.ts`
  - 拉取 manifest、下载 bundle
- `apps/desktop/src/bundle-verifier.ts`
  - SHA-256 与 Ed25519 校验
- `apps/desktop/src/bundle-installer.ts`
  - staging 解压、写入版本目录、完整性检查
- `apps/desktop/src/bundle-resolver.ts`
  - 解析当前 bundle、上一 bundle、候选 bundle
- `apps/desktop/src/bundle-activator.ts`
  - current / previous 切换、激活 candidate
- `apps/desktop/src/bundle-health-check.ts`
  - 启动后健康判定
- `apps/desktop/src/bundle-rollback.ts`
  - 回滚逻辑
- `apps/desktop/src/product-updater.ts`
  - 顶层协调器，替代现有面向 `electron-updater` 的 updater 角色

### 4.2 现有模块建议调整

- `apps/desktop/src/main.ts`
  - 从“启动 runtime + 启动 electron-updater”
  - 改为“启动 launcher 协调器 + 解析 current bundle + 启动 current runtime”

- `apps/desktop/src/runtime-config.ts`
  - 当前偏向从固定桌面包内解析 runtime
  - 需要改成从 active bundle 解析 runtime entry

- `apps/desktop/src/runtime-service.ts`
  - 当前支持以脚本路径拉起 runtime
  - 需要保留，但脚本路径来源改为 bundle 内 entrypoint

- `apps/desktop/src/updater.ts`
  - 不再作为主 updater
  - 建议 Phase 1 中删除或保留为兼容外壳并重定向到 `product-updater`

---

## 5. Bundle Contract 设计

### 5.1 建议 bundle 内结构

```text
bundle/
  manifest.json
  ui/
  runtime/
  plugins/
  migrations/
```

### 5.2 `manifest.json` 最低字段

```json
{
  "bundleVersion": "0.18.0",
  "platform": "darwin",
  "arch": "arm64",
  "uiVersion": "0.18.0",
  "runtimeVersion": "0.18.0",
  "builtInPluginSetVersion": "0.18.0",
  "launcherCompatibility": {
    "minVersion": "0.1.0"
  },
  "entrypoints": {
    "runtimeScript": "runtime/dist/cli/index.js"
  },
  "checksums": {},
  "migrationVersion": 1
}
```

### 5.3 合法性检查

launcher 安装 bundle 前必须验证：

- `platform` 匹配
- `arch` 匹配
- `bundleVersion` 合法
- `launcherCompatibility.minVersion` 满足
- entrypoint 存在
- UI 目录存在
- runtime 目录存在
- 内置插件目录存在或 manifest 明确声明为空

---

## 6. Update Manifest 设计

### 6.1 每个平台/架构一份清单

例如：

- `manifest-stable-darwin-arm64.json`
- `manifest-stable-darwin-x64.json`
- `manifest-stable-win32-x64.json`
- `manifest-stable-linux-x64.json`

### 6.2 最低字段

```json
{
  "channel": "stable",
  "platform": "darwin",
  "arch": "arm64",
  "latestVersion": "0.18.1",
  "minimumLauncherVersion": "0.1.0",
  "bundleUrl": "https://...",
  "bundleSha256": "abc...",
  "bundleSignature": "base64...",
  "releaseNotesUrl": "https://..."
}
```

### 6.3 客户端策略

- 只读取匹配当前平台/架构的清单
- 只允许版本单调升级
- 如果 launcher 版本低于 `minimumLauncherVersion`，则提示“需要先升级桌面壳”，但不尝试错误安装产品包

---

## 7. Launcher State 设计

建议增加统一状态文件，例如：

`<launcher-data-dir>/state.json`

### 最低字段

```json
{
  "channel": "stable",
  "currentVersion": "0.18.0",
  "previousVersion": "0.17.9",
  "candidateVersion": null,
  "lastKnownGoodVersion": "0.18.0",
  "badVersions": [],
  "lastUpdateCheckAt": "2026-04-11T12:00:00Z"
}
```

### 行为要求

- 切换前写入 candidate
- 健康后更新 current / previous / lastKnownGood
- 失败后追加 badVersions
- 对 bad version 进行短期或永久隔离，避免重启死循环

---

## 8. 详细实施任务

## Task 1：把桌面主进程重构成 launcher 入口

**目标：** 让 `apps/desktop` 从“直接启动固定 runtime 的桌面壳”变成“可解析 current bundle 的 launcher”。

**Files:**
- Modify: `apps/desktop/src/main.ts`
- Modify: `apps/desktop/src/runtime-config.ts`
- Modify: `apps/desktop/src/runtime-service.ts`
- Create: `apps/desktop/src/launcher-state.ts`
- Create: `apps/desktop/src/bundle-layout.ts`
- Create: `apps/desktop/src/bundle-resolver.ts`

**Steps:**

1. 抽出 launcher 数据目录与 bundle 目录计算逻辑
2. 定义 `current` / `previous` / `staging` / `versions/<version>` 的统一路径模型
3. 让 `main.ts` 启动前先解析 launcher state
4. 从 `current bundle` 读取 runtime entrypoint
5. 将 runtime 拉起逻辑改为依赖 bundle entry，而不是仓库固定路径

**验收：**

- 当前 bundle 存在时，桌面端能从 bundle 内启动 runtime
- 当前 bundle 缺失时，launcher 能给出明确错误

---

## Task 2：定义并实现 bundle contract

**目标：** 让桌面运行时有一个稳定、可验证的产品包结构。

**Files:**
- Create: `apps/desktop/src/bundle-manifest.ts`
- Create: `apps/desktop/src/bundle-installer.ts`
- Create: `apps/desktop/src/bundle-verifier.ts`
- Create: `apps/desktop/src/bundle-health-check.ts`
- Create: `apps/desktop/src/bundle-activator.ts`
- Create: `apps/desktop/src/bundle-rollback.ts`

**Steps:**

1. 定义 bundle manifest TypeScript 类型
2. 实现 manifest 解析与 schema 校验
3. 实现 bundle 解压逻辑
4. 实现入口文件、UI 目录、runtime 目录、plugins 目录的完整性检查
5. 实现 candidate 激活与 previous 记录
6. 实现失败回滚

**验收：**

- 损坏 bundle 无法进入激活步骤
- 缺失 UI 或 runtime 入口时，bundle 被拒绝
- candidate 启动失败时自动回滚成功

---

## Task 3：实现 update manifest 拉取与下载链路

**目标：** 让 launcher 能发现并下载新版本 product bundle。

**Files:**
- Create: `apps/desktop/src/update-manifest.ts`
- Create: `apps/desktop/src/update-client.ts`
- Create: `apps/desktop/src/product-updater.ts`
- Modify: `apps/desktop/src/main.ts`

**Steps:**

1. 定义 update manifest schema
2. 实现按平台/架构/渠道拼接 manifest URL
3. 实现 manifest 拉取与版本比较
4. 实现 bundle 下载到 staging
5. 接入 SHA-256 + Ed25519 校验
6. 下载成功后，把 candidate 写入 launcher state

**验收：**

- 有新版本时能正确识别
- 下载完成后 staging 中出现完整 bundle
- hash 或 signature 错误时更新失败且 current 不变

---

## Task 4：实现 Phase 1 的 UI 交互

**目标：** 给用户一个可理解、可操作的更新体验。

**Files:**
- Modify: `apps/desktop/src/preload.ts`
- Modify: `packages/nextclaw-ui/*` 或当前桌面设置页相关模块
- Modify: `apps/desktop/src/main.ts`

**Steps:**

1. 暴露 launcher update status 到 renderer
2. 提供至少这些 UI 状态：
   - 当前版本
   - 检查更新中
   - 新版本可用
   - 下载中
   - 下载完成，等待重启
   - 更新失败
3. 提供最少两个操作：
   - `检查更新`
   - `重启并更新`
4. 提供 diagnostics 文案，方便用户和团队排障

**验收：**

- UI 能显示当前 product bundle 版本
- 下载过程中有可见状态
- 下载完成后用户能触发切换

---

## Task 5：新增 bundle builder

**目标：** 从现有 monorepo 产出真正的桌面 product bundle。

**Files:**
- Create: `apps/desktop/scripts/build-product-bundle.mjs`
- Create: `apps/desktop/scripts/package-product-bundle.mjs`
- Modify: `apps/desktop/package.json`
- Modify: 相关 workspace 构建脚本

**Steps:**

1. 明确要打进 bundle 的产物：
   - `nextclaw-ui` 构建输出
   - `nextclaw` / `nextclaw-server` / `nextclaw-runtime` 所需运行产物
   - 桌面内置插件产物
2. 生成 bundle 目录结构
3. 生成 bundle `manifest.json`
4. 按平台/架构打包压缩
5. 输出 deterministic 的 bundle 文件名

**验收：**

- 本地能生成一个 bundle 压缩包
- 解压后结构完整
- launcher 可从该 bundle 成功启动应用

---

## Task 6：发布链路改造

**目标：** 让 CI 真正发布 launcher 安装物、product bundle、manifest、signature。

**Files:**
- Modify: `.github/workflows/desktop-release.yml`
- Modify: `.github/workflows/desktop-validate.yml`
- Create: `apps/desktop/scripts/sign-update-manifest.mjs`
- Create: `apps/desktop/scripts/sign-product-bundle.mjs`

**Steps:**

1. 桌面 release workflow 新增 bundle 产物构建
2. 为每个平台/架构产出对应 manifest
3. 对 manifest 与 bundle 进行 Ed25519 签名
4. 上传 release 产物到统一 release surface
5. 校验生成文件名、平台、架构的一致性

**验收：**

- release workflow 输出 launcher 安装物
- release workflow 输出 bundle
- release workflow 输出 manifest 与 `.sig`

---

## Task 7：端到端更新冒烟

**目标：** 验证“从旧版本到新版本切换成功，并且 UI/runtime 一起升级”。

**Files:**
- Create: `apps/desktop/scripts/smoke-product-update.mjs`
- Modify: `.github/workflows/desktop-validate.yml`
- Modify: `.github/workflows/desktop-release.yml`

**Steps:**

1. 准备旧 bundle
2. 准备新 bundle
3. 启动 launcher 指向旧 bundle
4. 提供本地测试 manifest
5. 模拟下载并安装新 bundle
6. 重启切换
7. 校验新版本 UI 与 runtime 都生效
8. 模拟坏 bundle，校验自动回滚

**验收：**

- 升级成功路径通过
- 坏包路径通过
- 回滚路径通过

---

## 9. 建议目录与命名约束

建议新增的构建输出目录：

- `apps/desktop/dist-launcher/`
- `apps/desktop/dist-bundles/`
- `apps/desktop/release-manifests/`

建议 bundle 文件命名：

- `nextclaw-bundle-darwin-arm64-0.18.0.tar.zst`
- `nextclaw-bundle-darwin-x64-0.18.0.tar.zst`
- `nextclaw-bundle-win32-x64-0.18.0.zip`
- `nextclaw-bundle-linux-x64-0.18.0.tar.zst`

建议 manifest 文件命名：

- `manifest-stable-darwin-arm64.json`
- `manifest-stable-win32-x64.json`
- `manifest-stable-linux-x64.json`

---

## 10. 与现有 Linux APT 路线的关系

当前仓库已有 Linux `.deb + APT repo` 规划。  
Phase 1 需要明确和它的边界：

### 推荐边界

- `.deb` 继续作为 Linux 首次安装与可选系统分发路径
- Phase 1 之后，Linux 桌面应用内仍可使用 launcher 驱动的 product bundle 更新
- APT 路线不再是唯一产品升级路径，而是安装 / 系统集成路径

### 为什么这样处理

因为这次桌面更新方案的产品目标是：

- 三平台都要“免手动下载更新”

如果 Linux 单独坚持“只靠 apt 更新”，那产品心智又会分裂。

所以推荐把 Linux `.deb` 理解成：

- 首装入口
- 系统集成入口

而不是桌面产品版本的唯一升级机制。

---

## 11. 风险与应对

### 风险 1：Phase 1 做得过重

**应对：**

- 不做 launcher 自更新
- 不做 delta
- 不做多渠道复杂灰度
- 只做 stable

### 风险 2：launcher 与 bundle 契约漂移

**应对：**

- 强制 `minimumLauncherVersion`
- 强制 bundle manifest schema
- 启动时显式校验 contract

### 风险 3：bundle 内容过大，下载时间长

**应对：**

- Phase 1 先接受全量包
- 后续再评估 delta，不提前复杂化

### 风险 4：现有桌面代码耦合仓库路径太深

**应对：**

- 优先改造 runtime path resolution
- 先让 bundle 启动闭环成立，再逐步清理开发态/打包态混合逻辑

---

## 12. 验收标准

Phase 1 只有同时满足下面条件才算完成：

1. launcher 能从 active bundle 启动桌面应用
2. UI、runtime、内置插件被打进同一个 bundle
3. launcher 能检查并下载新 bundle
4. launcher 能校验 hash 与签名
5. launcher 能切换 current / previous
6. 新版本启动成功后，UI 和 runtime 都升级
7. 新版本启动失败时，自动回滚到 previous
8. 三平台至少各有一条冒烟链路验证成功

---

## 13. 实施顺序建议

推荐按下面顺序落地，避免并行过多导致上下文失控：

### Step 1

先做 launcher 化重构：

- `main.ts`
- `runtime-config.ts`
- `runtime-service.ts`
- launcher state / bundle layout / bundle resolver

### Step 2

再做 bundle contract 与 local switch/rollback：

- bundle manifest
- bundle install
- activate / rollback

### Step 3

再做远程 update manifest 与下载：

- update client
- verifier
- product updater

### Step 4

再接桌面 UI：

- 检查更新
- 下载状态
- 重启更新

### Step 5

最后接 CI 发布与端到端冒烟。

---

## 14. 长期目标对齐 / 可维护性推进

- 本计划是对上一份架构方案的最小落地版本，优先解决“产品级更新闭环”，而不是一次把所有平台与 launcher 细节做满。
- 它沿着“单一产品包作为唯一版本单元”的方向推进，能显著减少未来 UI、runtime、插件三者之间的错位升级复杂度。
- 它避免继续在现有 `electron-updater` 路线上堆补丁，因为那条路在“无平台签名 + 三平台统一免手动下载更新”前提下，本身就不是最清晰的长期模型。
- 它优先做可回滚、可验证、可解释的全量包升级，而不是先追求差分、静默或多渠道复杂策略。这符合“删减优先、简单优先、可预测优先”的长期维护方向。

---

## 15. 最终建议

Phase 1 不应该再继续围绕“怎么把当前 Electron 安装包本体做成自动更新”展开。  
Phase 1 应该直接落成：

**`launcher 化 apps/desktop + versioned product bundle + manifest/signature + switch/rollback`**

这是一条真正可实施、且和前置架构结论一致的第一阶段计划。
