# NextClaw 桌面端免手动下载更新架构方案

**目标：** 设计一套覆盖 macOS、Windows、Linux 三个平台的桌面更新架构，让用户安装一次后，后续可以在应用内完成版本更新，而不需要手动下载新的安装包；同时保证 UI、运行时、本地服务逻辑、内置插件始终作为一个统一产品版本一起升级。

**当前约束：** 不依赖 Apple 代码签名、不依赖 Microsoft 代码签名、不依赖 macOS notarization，也不假设存在平台信任链下的原生自动更新通道。

**最终决策：** 不再把 Electron 自带应用更新器当作主架构，而是改为一套 `启动壳（launcher）+ 版本化产品包（versioned bundle）+ 自有更新清单（manifest）+ 自有签名校验 + 原子切换 + 自动回滚` 的更新模型。

---

## 1. 问题定义

我们真正需要的，不只是“桌面端自动更新”这个 Electron 语境下的能力，而是一套更强的产品能力：

- 用户只需要安装一次
- 应用后续能自己拉取新版本
- 用户不需要手动去官网下载新安装包
- UI 升级必须和运行时、内置插件一起发生
- 三个平台尽量共享同一套产品心智，而不是三套完全不同的更新故事
- 不要因为桌面更新去维护多套业务实现

当前 `electron-updater` 这条路，在“无平台签名”这个约束下，不足以成为这件事的主架构。问题不只是某个代码实现点，而是底层模型不匹配：

- Electron 原生更新更偏向“平台信任链 + 已签名桌面应用”
- 我们要的是“像 npm / Python 包管理一样，由产品自己管理版本下载、校验、切换”

所以要改的不是某个 API 调用，而是整个桌面产品的分发和升级架构。

---

## 2. 决策摘要

### 推荐方向

采用一套 **自主管理的桌面更新架构**：

1. 首次只安装一个很薄、很稳定的 **桌面启动壳（Desktop Launcher）**
2. 真正的 NextClaw 产品内容，改为存放在用户数据目录里的 **版本化产品包**
3. 启动壳负责检查更新、下载、校验、解压、切换、回滚
4. **UI + runtime + 内置插件 + 本地服务代码** 全部打进同一个版本化产品包，保证它们一定一起升级
5. 更新信任不依赖平台签名，而依赖我们自己的更新清单和更新包签名

### 明确推荐

对 NextClaw 来说，桌面端的发布单元应该变成：

- 一个启动壳
- 一个版本化产品包
- 一个更新清单

启动壳是安装层、平台层的载体。  
版本化产品包才是真正不断更新的 NextClaw 产品本体。

这套模型最接近：

- `npm update`
- Python 包更新
- 各类游戏启动器 / runtime launcher

也就是：用户装的是一个稳定入口，真正频繁变化的是入口背后可替换的版本内容。

---

## 3. 为什么这是当前最优解

### 为什么不继续把 `electron-updater` 当主方案

- 它更适合“桌面安装包本体就是主更新单位”的模型
- 在无签名前提下，三平台行为天然不对称
- 它会继续把“应用安装物”当作可变主体，而不是把“产品版本内容”当作可变主体

### 为什么不做“直接覆盖安装目录里的 app”

- 直接替换安装包本体更脆弱
- 文件锁、平台差异、安装位置权限会变成设计中心
- 安装器语义和产品更新语义会继续缠在一起

### 为什么 `launcher + versioned bundle` 更好

- 更新模型更像包管理器，而不是安装器
- UI 天然随产品包一起升级
- 回滚天然更容易做
- 即使首次安装方式因平台不同而不同，产品级更新心智仍能统一
- 未来插件分发也能复用这套签名、校验、切换机制

---

## 4. 总体架构

### 4.1 组件划分

#### A. Desktop Launcher

启动壳负责：

- 首次引导
- 检查更新
- 下载更新
- 校验更新包
- 解压到新版本目录
- 切换当前版本
- 新版本启动失败时回滚
- 托盘、开机自启等平台能力

启动壳不负责：

- 核心业务逻辑
- 会话/任务/编排逻辑
- 插件业务执行

启动壳必须刻意保持“薄”和“稳定”。

#### B. Versioned Product Bundle

版本化产品包才是真正的 NextClaw 产品版本。每个版本包至少包含：

- 桌面端 UI 渲染资源
- NextClaw runtime / 本地服务逻辑
- 内置插件 / 内置渠道 / 扩展能力
- 兼容性元数据
- 必要的数据迁移脚本
- 包内 manifest

重要结论：

**UI 属于产品包，不是独立更新层。**

这正是对“UI 也必须跟着升级”的回应。我们不把 UI 升级和 runtime 升级拆开，而是直接把它们打成一个原子版本。

#### C. Update Manifest

远端提供机器可读的更新清单，至少包含：

- 渠道
- 平台
- 架构
- 最新版本号
- 最低 launcher 版本要求
- 产品包下载地址
- 包大小
- SHA-256
- Ed25519 签名
- 可选 release notes
- 可选灰度比例

#### D. Current Pointer

本地一个很小的状态文件，告诉 launcher 当前激活的是哪个版本目录。

#### E. Rollback State

本地记录：

- 上一个已知健康版本
- 当前候选版本
- 候选版本的启动验证结果

---

## 5. 发布单元定义

桌面端发布单元建议拆成三层：

- `launcher version`
- `product bundle version`
- `compatibility contract version`

### 产品包内容

每个桌面产品包包含：

- UI renderer bundle
- 本地 runtime / service bundle
- 如果需要，还包含 preload / IPC contract 版本
- 内置插件/扩展集
- 静态资源
- 发布元数据

这意味着当版本 `0.18.1` 升级成功后：

- UI 一起升级
- 本地后端一起升级
- 内置插件集一起升级
- 行为语义一起升级

这才是最一致的产品体验。

---

## 6. 本地目录结构

### macOS

```text
~/Library/Application Support/NextClaw/
  launcher/
    state.json
    channels.json
    logs/
  versions/
    0.18.0/
      manifest.json
      ui/
      runtime/
      plugins/
    0.18.1/
      manifest.json
      ui/
      runtime/
      plugins/
  current
  previous
  staging/
```

### Windows

```text
%LocalAppData%/NextClaw/
  launcher/
  versions/
  current
  previous
  staging/
```

### Linux

```text
~/.local/share/nextclaw/
  launcher/
  versions/
  current
  previous
  staging/
```

这里的 `current` 不建议依赖 symlink 作为唯一方案。  
更推荐统一用一个小型 pointer file 来记录当前版本，这样在 Windows 和打包环境里行为更可预测。

---

## 7. 产品包格式

### 推荐格式

- macOS / Linux：`.tar.zst`
- Windows：`.zip`

### 包内结构

```text
bundle/
  manifest.json
  ui/
  runtime/
  plugins/
  migrations/
```

### `manifest.json` 最低字段

- `bundleVersion`
- `platform`
- `arch`
- `uiVersion`
- `runtimeVersion`
- `builtInPluginSetVersion`
- `launcherCompatibility.minVersion`
- `entrypoints`
- `checksums`
- `migrationVersion`

launcher 在以下情况下必须拒绝激活该包：

- 平台不匹配
- 架构不匹配
- launcher 版本过低
- 必要入口文件缺失
- hash 校验失败
- 签名校验失败

---

## 8. 无平台签名时的信任模型

没有 Apple / Microsoft 代码签名，不等于没有信任。

我们需要的是 **产品自有信任链**。

### 推荐信任模型

- HTTPS 下载
- SHA-256 完整性校验
- Ed25519 对 update manifest 和 product bundle 做签名

### 关键澄清

这不是平台意义上的代码签名。  
它不会让应用变成“被 macOS / Windows 平台信任的已签名应用”。  
但它足以让 NextClaw 自己信任“这是我们发出的合法更新包”。

### 密钥策略

- 离线根密钥
- 发布阶段使用受控的 release signing key
- launcher 内嵌公钥

---

## 9. 启动流程

### 首次安装

1. 用户先安装 launcher
   - macOS：`.app` 或安装器
   - Windows：安装器
   - Linux：`.deb`、AppImage 或后续其他形式
2. launcher 内含一个 seed bundle，或首次启动时拉取 stable 初始包
3. launcher 将首个产品包写入 `versions/<version>`
4. 写入 `current`
5. 启动当前版本对应的 runtime，并打开 UI

### 常规启动

1. launcher 读取本地状态
2. 解析 `current`
3. 从当前版本目录启动 NextClaw runtime
4. 由当前版本目录提供 UI
5. 应用进入健康状态后，后台开始检查更新

---

## 10. 更新流程

### 用户体验目标

用户不需要去浏览器里手动下载新安装包。

理想流程：

1. 应用检查到新版本
2. 后台下载新产品包
3. 完成签名与完整性校验
4. 解压到 staging / versions
5. 提示用户：
   - 立即重启更新
   - 稍后
6. 重启后自动切换到新版本
7. UI、runtime、内置插件同时生效

### 详细流程

1. 拉取 update manifest
2. 比较当前版本与候选版本
3. 若候选版本更新，则：
   - 下载到 staging
   - 校验 hash
   - 校验签名
   - 解压到 `versions/<candidate>`
   - 校验入口文件和 manifest
4. 在本地状态里标记 candidate
5. 用户触发重启或下次启动时：
   - 当前版本记录为 previous
   - candidate 写入 current
   - 启动 candidate
6. candidate 启动验证通过，则标记为 last known good
7. candidate 启动失败，则触发自动回滚

---

## 11. 启动验证与回滚

这套架构里，回滚是强制能力，不是锦上添花。

### 新版本健康判定

launcher 只有在下面条件都满足时，才认为新版本启动成功：

- runtime 进程拉起成功
- 健康检查接口在超时时间内 ready
- UI 入口成功加载
- launcher 与 bundle 的契约版本兼容

### 回滚流程

如果 candidate 启动失败：

1. 停掉失败 candidate
2. 把 previous 恢复为 current
3. 重新拉起 previous
4. 将失败 candidate 标记为 bad version，避免重启死循环
5. 弹出用户可见的诊断提示并记录日志

### 为什么必须有回滚

既然我们不用平台签名的原生更新信任链，就更要把“产品级回滚”做成第一公民。这是整套方案的安全垫。

---

## 12. Launcher 自身更新策略

上面的设计首先解决的是 **产品包更新**。  
但 launcher 本身未来也会变，不能完全忽略。

### 建议拆成两类更新

#### A. Product Bundle Update

频繁发生、应用内完成、免手动下载。

它负责：

- UI 更新
- runtime 更新
- 内置插件更新
- 大部分产品功能迭代

#### B. Launcher Update

较少发生、偏平台层、偏兼容层。

它负责：

- 更新协议升级
- 托盘 / 开机自启 / 本地集成变化
- launcher 自身安全修复

### 推荐策略

第一阶段不要把 launcher 自更新做得太重。

推荐：

- **Phase 1**
  - 产品包更新完全应用内完成
  - launcher 更新允许保留“低频、受控”的升级方式
- **Phase 2**
  - 再增加 launcher helper，使 launcher 也能做到免手动下载切换

这样可以先把主要用户体验做对，而不是一开始把最复杂的部分全做满。

---

## 13. 三平台策略

### macOS

- 不依赖平台已签名更新链
- 安装 launcher 一次
- 可变内容放在用户目录，而不是把 `.app` 本体当成主要可变对象
- 产品更新通过 bundle 切换完成

### Windows

- 同样采用 launcher + versioned bundle
- 需要在受控重启点完成切换
- 运行内容写入用户目录，避免频繁改动安装目录主程序

### Linux

- 同样可以走 launcher + versioned bundle
- 首次安装可以继续是 `.deb` / AppImage
- 产品后续升级由 launcher 主导

### 关键产品取舍

这套方案本质上是：

**优先统一产品体验，而不是优先服从各平台原生包管理语义。**

如果我们的硬需求是“三平台都要免手动下载更新”，这是正确方向。

---

## 14. UI 升级模型

这一节单独写，是因为它是本需求的核心之一。

### 原则

UI 不是独立更新层。  
UI 属于版本化 product bundle。

### 结果

当版本 `0.18.1` 被激活时：

- `0.18.1` 的 UI 生效
- `0.18.1` 的 runtime 生效
- `0.18.1` 的内置插件集生效

不会存在下面这种长期混搭状态：

- 旧 UI 对接新 runtime
- 新 UI 对接旧 runtime

除非我们在切换窗口期刻意做非常窄的兼容桥接。

### 推荐约束

把 UI/runtime 契约尽量限定在同一个 bundle version 内，不要把长期 mixed-version 兼容做成默认能力。这样系统更小、更清晰、更可维护。

---

## 15. 从当前桌面架构迁移的方式

现状：

- `apps/desktop` 已经存在
- 当前桌面端已经负责拉起本地 runtime
- 当前 updater 逻辑已经存在，但它是偏 installer-style 的模型

### 推荐迁移方向

**不要推翻 `apps/desktop`。**

把它逐步演进成 launcher。

### 迁移步骤

#### Phase 1：把 `apps/desktop` 明确收敛成 launcher 职责

- 保留 window / preload / tray / update orchestration
- 去掉“桌面安装物本体就是主版本单元”的假设
- 让它学会解析 `current bundle` 并从该目录启动 runtime

#### Phase 2：新增 bundle builder

增加一个构建目标，产出真正的桌面产品包，内容包括：

- UI bundle
- runtime / service bundle
- 内置 desktop plugin payload
- bundle manifest

#### Phase 3：新增 update manifest + staged activation

- manifest 拉取
- bundle 下载
- 签名校验
- staged 解压
- 重启切换
- 自动回滚

#### Phase 4：降低 installer-style 更新的重要性

首次安装仍然使用平台安装包。  
但功能版本升级的主路径，改为 product bundle 更新，而不是继续把整个安装包当主升级单位。

---

## 16. 发布流水线调整

新的桌面发布流水线应该产出：

1. 各平台 launcher 安装物
2. 各平台 / 架构的 product bundle
3. 对应渠道的平台更新 manifest
4. manifest 与 bundle 的签名文件
5. release notes 元数据

### 最小发布产物建议

- `nextclaw-launcher-macos-<version>.dmg`
- `nextclaw-launcher-windows-<version>.exe`
- `nextclaw-launcher-linux-<version>.deb`
- `nextclaw-bundle-darwin-arm64-<productVersion>.tar.zst`
- `nextclaw-bundle-darwin-x64-<productVersion>.tar.zst`
- `nextclaw-bundle-win32-x64-<productVersion>.zip`
- `nextclaw-bundle-linux-x64-<productVersion>.tar.zst`
- `manifest-stable-darwin-arm64.json`
- `manifest-stable-win32-x64.json`
- `manifest-stable-linux-x64.json`
- 对应 `.sig`

---

## 17. 安全基线

即使没有 Apple/Microsoft 平台签名，也必须要求：

- 只允许 HTTPS 更新源
- manifest 强制签名校验
- bundle 强制签名校验
- 非显式允许时禁止 downgrade
- 坏版本 quarantine
- 启动失败自动回滚
- 更新日志与诊断日志落盘

后续可选增强：

- 灰度比例发布
- 最低 launcher 版本限制
- 坏版本远程 blocklist

---

## 18. 验证计划

### 必做验证

1. macOS / Windows / Linux 全平台 fresh install
2. 首次 seed bundle 引导成功
3. 检测到新 bundle
4. bundle 下载成功
5. hash 与签名校验成功
6. 重启后切换到新版本
7. 验证 UI 版本变化
8. 验证 runtime 版本变化
9. 验证内置插件集变化
10. 注入坏包并验证自动回滚

### 必做冒烟覆盖

- 正常更新路径
- 下载中断路径
- 损坏压缩包路径
- 损坏签名路径
- candidate 启动失败路径
- rollback 路径

---

## 19. 代价与收益

### 收益

- 三个平台都能共享“免手动下载”的产品更新模型
- UI 与 runtime 天然一起升级
- rollback 能力天然成立
- 后续插件分发也能复用同一套 artifact / signature / switch 机制
- 不再把产品升级语义绑死在平台桌面安装器能力上

### 代价

- 我们要自己维护更多 updater 逻辑
- 需要一套 release signing 基础设施
- 需要 launcher/runtime 兼容性纪律
- 比直接接 `electron-updater` 更重

这个代价是值得的，因为我们的产品要求，本来就比“无签名情况下简单接一个桌面原生 updater”更强。

---

## 20. 推荐实施范围

### 推荐 Phase 1

先做：

- launcher 化的 `apps/desktop`
- versioned product bundle
- signed update manifest
- bundle 下载 / 校验 / 切换 / rollback

暂不做：

- 完整 launcher 自更新
- delta patch
- 复杂多渠道体系（除了 `stable` 与最多一个内部渠道）

### 为什么这样分期

这样既能对齐长期方向，又不会第一波就把系统做得过重。

---

## 21. 长期目标对齐 / 可维护性推进

- 这套方案把 NextClaw 往真正的“单内核、多宿主、多分发通道”方向推进：桌面 launcher 只是稳定宿主，真正不断演进的产品逻辑则是可替换的版本包。
- 它明确承认 UI 是产品本体的一部分，不是附属物。UI、runtime、内置扩展不再通过各种 mixed-version 补丁勉强维持，而是通过统一版本包原子切换一起演进。
- 它避免为三个平台分别维护三套桌面更新故事。平台差异主要被限制在首次安装打包和少量 launcher 集成层，而不是扩散到业务逻辑层。
- 它比继续围绕 unsigned 原生 updater 叠补丁更清晰、更可预测。
- 这套方案最核心的简化原则是：

**默认更新的是“产品包”，不是“整个安装物”。**

---

## 22. 最终建议

在“没有 Apple / Microsoft 平台签名，但 macOS / Windows / Linux 都必须支持应用内免手动下载更新”这个前提下，NextClaw 桌面端最推荐的架构是：

**`Electron launcher + 版本化 NextClaw 产品包 + 自有 manifest / signature 校验 + 原子切换 + 自动回滚`**

这是目前最现实、最统一、也最符合产品要求的方案。它同时满足：

- 用户安装一次
- 后续更新不手动下载
- UI 跟着产品逻辑一起升级
- 三平台共享同一更新心智
- 仍然保持一套代码库

而不是继续把希望放在 unsigned 平台原生应用更新链上。
