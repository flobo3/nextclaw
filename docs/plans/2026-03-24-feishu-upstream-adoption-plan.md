# NextClaw 飞书官方插件能力对齐设计

## 背景

用户目标已经明确，不是“做一个可用的飞书通道”，而是站在 AgentOS 视角，把飞书这类高频工作入口纳入 NextClaw 的第一入口能力版图。

这意味着我们要尽量对齐飞书官方插件的工作面能力，但不能把 OpenClaw 整个平台壳层和运行时耦合一起照单全收。判断标准只有三条：

1. 是否显著提升 NextClaw 作为第一入口的体验。
2. 是否能以低复杂度、低耦合、可维护的方式吸收。
3. 是否能尽量复制飞书特有实现，而不是复制 OpenClaw 的整套宿主系统。

## 最终决策

本次采用“官方飞书插件源码 vendoring + NextClaw loader 最小桥接”的方案，而不是继续扩展 `@nextclaw/channel-runtime` 里的简化飞书实现，也不是运行时直接依赖 `@openclaw/feishu` npm 包。

具体做法：

1. 把 `@openclaw/feishu@2026.3.13` 的飞书插件源码 vendoring 到 `@nextclaw/channel-plugin-feishu`。
2. 保留官方飞书插件的 `doc / chat / wiki / drive / scopes / bitable` 工具注册与飞书通道逻辑。
3. 让 NextClaw 的 `@nextclaw/openclaw-compat` loader 优先使用插件自身携带的 `openclaw` 依赖，而不是无条件落到 compat shim。
4. 对 jiti 无法安全执行的外围依赖，增加 NextClaw 侧最小 shim，只桥接阻塞加载的包，不把 OpenClaw 整个 runtime 继续搬进来。

这个方案同时满足：

- 飞书能力表面最大化复用官方实现；
- NextClaw 仍然掌握宿主系统、插件加载与产品边界；
- 复杂度主要收敛在一个 bundled plugin 包和 compat loader，而不是扩散到 channel runtime 主链路。

## 为什么不再走 Phase 1 底座方案

之前的 “feishu-core + channel-runtime 渐进改造” 方案，本质上还是在 NextClaw 内部重写一套飞书能力，再慢慢补齐官方插件已有表面。这和用户要求的“一次性完成”“尽量复制飞书特有代码”已经不一致。

它的问题是：

- 能力对齐速度慢；
- 很多飞书工具表面需要重复造轮子；
- 代码长期会分裂成 “runtime 飞书实现” 和 “官方插件能力实现” 两套路线。

所以这次不再把“底座先行”当成完成标准，而是直接把官方飞书插件作为主实现来源，NextClaw 只负责把它以可维护的方式接进来。

## 代码结构设计

### 1. `@nextclaw/channel-plugin-feishu`

这是新的 NextClaw bundled plugin 包，直接承载 vendored 飞书插件源码。

保留内容：

- `index.ts`
- `src/*`
- `skills/*`
- `openclaw.plugin.json`

包元数据调整：

- 包名保持 `@nextclaw/channel-plugin-feishu`
- `openclaw.install.npmSpec` 指向 NextClaw 自己的包名
- `exports` 与 `openclaw.extensions` 指向仓库内源码入口
- 本包依赖精确锁定 `openclaw@2026.3.13`，确保与 vendored 源码版本一致

### 2. `@nextclaw/openclaw-compat`

这里不是去“兼容整个 OpenClaw”，而是把 bundled plugin loader 调整到对 vendored 官方插件友好：

- bundled plugin 加载时，按插件自己的 `rootDir` 建 jiti alias 上下文
- 当插件自身已经带有可运行的 `openclaw` 包时，不再把 `openclaw/plugin-sdk` 强行 alias 到 NextClaw compat shim
- jiti 开启 `esmResolve`，兼容 `exports.import` 子路径
- 对 `@mariozechner/pi-coding-agent` 增加最小 shim，避免 jiti 在插件加载阶段被 `import.meta.resolve` 阻塞
- bundled plugin 的入口解析与模块加载 helper 外提，避免 `loader.ts` 继续膨胀

### 3. 保持产品边界

本次明确不做两件事：

- 不把 OpenClaw 的宿主生命周期、agent runtime、配置系统整体复制进 NextClaw
- 不让 NextClaw 运行时依赖上游 `@openclaw/feishu` 包

也就是说，飞书特有代码可以复制，宿主系统不复制；阻塞加载的外围依赖可以做最小桥接，但不把桥接扩大成平台迁移。

## 能力对齐结果

本次接入后，NextClaw bundled Feishu plugin 已能在插件注册层加载出以下表面：

- `feishu_doc`
- `feishu_app_scopes`
- `feishu_chat`
- `feishu_wiki`
- `feishu_drive`
- `feishu_bitable_get_meta`
- `feishu_bitable_list_fields`
- `feishu_bitable_list_records`
- `feishu_bitable_get_record`
- `feishu_bitable_create_record`
- `feishu_bitable_update_record`
- `feishu_bitable_create_app`
- `feishu_bitable_create_field`

`feishu_perm` 保持官方默认行为，未开启时按配置禁用。

## 风险与控制

### 已接受的风险

1. 当前 loader 对 `@mariozechner/pi-coding-agent` 使用的是最小 shim，而不是真实运行时。
2. 这意味着如果未来某个 OpenClaw 插件在“加载阶段”就强依赖该包的真实 agent runtime 语义，仍需要继续补桥。

### 为什么可以接受

1. 本次目标是飞书官方插件能力对齐，而不是 OpenClaw 平台全量宿主兼容。
2. 当前飞书插件实际加载、注册和 CLI 冒烟都已通过，说明现有飞书能力路径不依赖那套真实 runtime。
3. shim 只存在于 plugin loader 边界，不污染 NextClaw 主运行时契约。

## 验证基线

本次以四层验证闭环作为发布门槛：

1. `@nextclaw/openclaw-compat` build
2. `@nextclaw/openclaw-compat` lint
3. `@nextclaw/channel-plugin-feishu` lint
4. 真实 registry 探针确认 Feishu plugin loaded 且工具注册完整
5. 隔离 `NEXTCLAW_HOME` 的 CLI `plugins list --json` 冒烟确认用户视角可见
6. post-edit maintainability guard 通过，无阻塞项

## 发布范围

按这次实际影响面，changeset 至少覆盖：

- `@nextclaw/channel-plugin-feishu`
- `@nextclaw/openclaw-compat`
- `nextclaw`

由于仓库存在固定 release group，`nextclaw` 进入发布时还需联动：

- `@nextclaw/mcp`
- `@nextclaw/server`

## 后续继续吸收的方向

这次已经把飞书官方插件作为主实现源接进来，后续飞书能力扩展应继续沿这条线推进，而不是回退到双实现结构。

优先级建议：

1. 把 loader 最小 shim 再收敛成更清晰的官方插件桥接层
2. 继续评估官方飞书插件中尚未暴露到 NextClaw 的剩余表面
3. 对高价值飞书工作面能力做端到端真实冒烟
4. 当某些 OpenClaw SDK helper 已被多个 bundled plugin 共同依赖时，再考虑抽成 NextClaw 自维护的通用适配层
