# v0.16.22-desktop-windows-startup-seed-metadata

## 迭代完成说明（改了什么）

- 重新排查了 Windows 桌面端“安装后首次启动很久、CPU/风扇明显拉高”的链路，并把前次修复与当前 `0.17.11 / 0.0.140` 正式版对比了一遍。
- 结论不是“根本没修”，也不是“已经彻底修好”：
  - `v0.16.4-desktop-windows-startup-bootstrap-io-trim` 的修复仍然在，安装阶段不再默认做二次整包复制。
  - 但当前桌面首启仍然要在开窗前处理 packaged seed bundle，而且当前 `0.17.11` 的 seed 体积较当时又回涨了一部分。
  - 本地重新统计当前 seed bundle：约 `20.30MB` 压缩体积、`12643` 文件、解压后约 `70.57MB`；相比当时修完后的 `18MB / 11843 / 62.44MB`，确实有回涨，但没有回到最早的 `33MB / 21331 / 130.39MB`。
- 本次没有再误判成“页面渲染慢”或“init 本身慢”，而是把根因收敛为两层：
  - 主因仍是 packaged seed 首启要完整解压成上万小文件；在 Windows Defender / 企业杀毒 / 慢盘环境下，会被放大成明显的高 CPU 与长等待。
  - 当前启动器在是否安装 packaged seed 的判断阶段，还会重复读取同一个 zip 多次去拿版本和指纹，进一步放大启动前 I/O。
- 本次已落地一轮低风险优化：
  - `prepare-seed-bundle.service.mjs` 现在会在打包 seed 后把 `version / sha256 / archiveBytes / fileCount / directoryCount / uncompressedBytes` 写回 packaged `update-release-metadata.json`。
  - `DesktopUpdateSourceService` 现在能读取 packaged seed metadata。
  - `DesktopBundleBootstrapService` 现在优先用 packaged metadata 判断 seed 版本与归档指纹，避免首启时为了“只是判断要不要装”而反复整包读 zip。
  - `main.ts` 现在会记录 `bundle bootstrap` 与 `runtime startup` 两段耗时，方便后续在真实 Windows 现场日志里判断时间究竟卡在 seed 安装前后哪一段。
- 同时补了一条回归测试，确保当 packaged metadata 已经说明 seed 比当前版本更旧时，启动器可以直接跳过，不会再去碰缺失或不必要读取的 seed zip。
- 为了让这次 preview beta 更容易和刚发出的 stable 区分，本次把桌面 launcher 版本从 `0.0.140` 提到了 `0.0.141`；`nextclaw` bundle 版本仍保持 `0.17.11`。
- 在 beta preview 用户实测确认“看起来没问题”后，本批改动继续提升为正式稳定版：
  - 新桌面正式 release tag：`v0.17.11-desktop.2`
  - 新桌面 launcher 版本：`0.0.141`
  - `nextclaw` bundle 版本：`0.17.11`
- 同批次补齐了 landing 页 stable fallback，把官网兜底下载目标从 `v0.17.11-desktop.1 / 0.0.140` 切到 `v0.17.11-desktop.2 / 0.0.141`，避免 GitHub Releases API 失手时仍回退到旧安装包。
- 同批次继续补齐了 landing 的静态 HTML 结构化数据入口，避免官网运行时入口已经是新版本，但 SEO / 分享抓取面仍停在旧 release：
  - [apps/landing/en/index.html](/Users/peiwang/Projects/nextbot/apps/landing/en/index.html)
  - [apps/landing/en/download/index.html](/Users/peiwang/Projects/nextbot/apps/landing/en/download/index.html)
  - [apps/landing/zh/index.html](/Users/peiwang/Projects/nextbot/apps/landing/zh/index.html)
  - [apps/landing/zh/download/index.html](/Users/peiwang/Projects/nextbot/apps/landing/zh/download/index.html)
  - 上述 4 个 `downloadUrl` 现已统一切到 `https://github.com/Peiiii/nextclaw/releases/tag/v0.17.11-desktop.2`
- 本次正式版发布正文：[github-release.md](/Users/peiwang/Projects/nextbot/docs/logs/v0.16.22-desktop-windows-startup-seed-metadata/github-release.md)

## 测试/验证/验收方式

- 已通过：`pnpm -C apps/desktop lint`
- 已通过：`pnpm -C apps/desktop tsc`
- 已通过：`pnpm -C apps/desktop build:main && node --test apps/desktop/dist/src/services/desktop-bundle-bootstrap.service.test.js`
  - 结果：3 条桌面 bootstrap 相关测试全部通过，包括新增的 packaged metadata 跳过场景。
- 已通过：`pnpm -C apps/desktop bundle:release-metadata -- --channel stable --release-tag v0.17.11-desktop.1 --output build/update-release-metadata.json`
- 已通过：`pnpm -C apps/desktop bundle:seed -- --platform darwin --arch arm64`
  - 结果：`build/update-release-metadata.json` 已包含 `seedBundle` 元数据，且与实际 zip 统计一致：
    - `version = 0.17.11`
    - `archiveBytes = 20296727`
    - `fileCount = 12643`
    - `directoryCount = 1978`
    - `uncompressedBytes = 70569748`
- 已通过：`PATH=/opt/homebrew/bin:$PATH pnpm desktop:package:verify`
  - 结果：
    - 新 DMG 产物：`apps/desktop/release/NextClaw Desktop-0.0.141-arm64.dmg`
    - 包内公钥可真实验证线上 stable manifest 签名
    - seed bundle version 已验证为 `0.17.11`
    - seed runtime `init` 验证通过
    - DMG 安装级 smoke 通过
- 已完成：`v0.17.11-desktop-beta.1` 现场验收
  - 结果：用户在真实环境反馈“看起来没问题”，因此本批改动继续提升为正式版发布。
- 已执行：`pnpm lint:maintainability:guard`
  - 结果：增量 maintainability / governance 检查通过。
  - 未完全通过项：最后的 `check:governance-backlog-ratchet` 仍因仓库既有 `docFileNameViolations` 基线从 `11` 漂移到 `13` 失败；该阻断与本次桌面启动改动无直接关系，本次未扩 scope 处理历史文档命名债务。
- 已通过：`pnpm -C apps/landing build`
- 已通过：`pnpm -C apps/landing lint`
  - 结果：无 error；保留既有 warning：[`apps/landing/src/main.ts`](/Users/peiwang/Projects/nextbot/apps/landing/src/main.ts) 超长文件与超长 `render` 方法，本次没有继续放大该债务。
- 已通过：`pnpm -C apps/landing tsc`
- 已通过：`rg -n "v0\\.17\\.11-desktop\\.2|0\\.0\\.141|NextClaw\\.Desktop-0\\.0\\.141" apps/landing/dist`
  - 结果：构建产物中的主 bundle 已包含新的正式版 tag、版本号和四个平台下载资产名。
- 已通过：`pnpm deploy:landing`
  - Wrangler 返回的本次部署地址：`https://b7080200.nextclaw-landing.pages.dev`
- 已通过：线上回读部署后的 `/en/download/` HTML
  - 结果：部署后的静态 HTML 中，结构化数据 `downloadUrl` 已切到 `v0.17.11-desktop.2`，不再停在旧的 `v0.17.8-desktop.1`。
- 未执行：真实 Windows 安装级冒烟
  - 原因：当前工作环境不是 Windows，无法在本机直接复现安装包现场；因此本次关于 Windows 真实收益的判断，仍需以后续 release 包在 Windows 实机日志中复核。

## 发布/部署方式

- 本次代码变更无需额外迁移。
- 后续桌面发包仍按既有流程：
  - `pnpm -C apps/desktop bundle:release-metadata -- --channel <stable|beta> --release-tag <tag> --output build/update-release-metadata.json`
  - `pnpm -C apps/desktop bundle:seed -- --platform <platform> --arch <arch>`
  - `pnpm -C apps/desktop build:main`
  - `pnpm -C apps/desktop exec electron-builder ...`
- 由于 packaged seed metadata 已并入 `update-release-metadata.json`，新的正式/预发布安装包会自动携带这份元数据，无需额外人工步骤。
- 本次实际发布分两步完成：
  - preview beta：`v0.17.11-desktop-beta.1`
  - 正式稳定版：`v0.17.11-desktop.2`
- 正式稳定版发布口径：
  - launcher version：`0.0.141`
  - bundle version：`0.17.11`
  - release note：对齐 [github-release.md](/Users/peiwang/Projects/nextbot/docs/logs/v0.16.22-desktop-windows-startup-seed-metadata/github-release.md)
- landing 页 stable fallback 需与正式版同步指向 `v0.17.11-desktop.2`，避免官网兜底仍分发旧版 `0.0.140` 安装包。
- landing 官网静态站点已重新部署：
  - 命令：`pnpm deploy:landing`
  - 本次 Pages 部署地址：`https://b7080200.nextclaw-landing.pages.dev`
  - 目标：让运行时 fallback、SEO 结构化 `downloadUrl`、下载页入口和正式 GitHub release 同步收敛到同一个稳定版。

## 用户/产品视角的验收步骤

1. 打开本次正式版 GitHub release 页面并下载新的 Windows 桌面安装包。
2. 首次打开时观察是否仍出现“长时间没有窗口、CPU 明显拉满、风扇持续转”的情况。
3. 若仍偏慢，打开桌面主进程日志，查看新增的两段时间：
   - `Desktop bundle bootstrap finished in ...ms`
   - `Desktop runtime startup finished in ...ms`
4. 如果第一段远大于第二段，说明时间主要仍耗在 packaged seed 安装/解包；如果第二段更大，才继续往 runtime init / serve 健康等待方向查。
5. 再次关闭并重开桌面端，确认后续冷启动明显快于首次启动，且不再重复 packaged seed 安装的重活。
6. 在官网 landing 页触发 stable fallback 场景时，确认下载目标已经落到 `v0.17.11-desktop.2 / 0.0.141`，而不是旧的 `v0.17.11-desktop.1 / 0.0.140`。
7. 在官网首页与下载页查看页面源码或分享抓取结果，确认结构化数据 `downloadUrl` 也已经落到 `v0.17.11-desktop.2`，而不是历史残留的 `v0.17.8-desktop.1`。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。
  - 本次没有为了排查 Windows 慢启动再引入新的兼容分支、开关或旁路，而是优先在现有 packaged seed 启动链路内删减重复工作，并补上可定位的阶段耗时日志。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。
  - 本次没有新增第二套启动流程，而是通过 packaged seed metadata 把“读版本 / 算指纹”从运行时重复读取 zip，收敛为构建期一次写入、运行时直接读取。
  - 仍未做到总代码净删除，原因是现有桌面发包合同里此前并没有 packaged seed metadata，这次需要补最小必要数据结构与读取逻辑才能真正删掉运行时重复 I/O。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：
  - 本次总代码净增长，但没有新增文件，也没有新增目录层级。
  - 代码增减报告：
    - 新增：271 行
    - 删除：37 行
    - 净增：234 行
  - 非测试代码增减报告：
    - 新增：226 行
    - 删除：37 行
    - 净增：189 行
  - 这部分增长主要用于把 packaged seed metadata 作为正式合同前移到构建期，并把判断逻辑集中到 `DesktopBundleBootstrapService` / `DesktopUpdateSourceService`，属于为减少启动期重复 I/O 支付的最小必要增长。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。
  - 构建期 metadata 仍收敛在 `prepare-seed-bundle.service.mjs`。
  - packaged seed 判定仍收敛在 `DesktopBundleBootstrapService`。
  - packaged metadata 的读取仍收敛在 `DesktopUpdateSourceService`。
  - 没有把启动性能判断散落到 UI、runtime CLI 或额外脚本中。
  - 与发布面相关的增量只落在 landing 的 stable fallback 常量，没有再引入新的运行时分支或第二套下载决策逻辑。
  - 本轮补齐的静态 HTML 入口仍保持为最小显式常量替换，没有再额外引入模板脚本、构建时注入层或新的 HTML 生成旁路。
- 目录结构与文件组织是否满足当前项目治理要求：满足当前增量治理要求。
  - `lint:new-code:governance` 已通过。
  - 仍保留的非本次阻断债务是仓库级 `doc file-name backlog ratchet` 基线漂移，本次未扩 scope 处理。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已执行独立复核。
  - 可维护性复核结论：保留债务经说明接受
  - 本次顺手减债：是
  - no maintainability findings
  - 长期目标对齐 / 可维护性推进：这次顺着“更少隐式重活、更少 surprise、诊断更直接”的方向前进了一步。它还没有把 Windows 首启慢的问题彻底消灭，因为真正的大头仍是 packaged seed 首次解压 1.2 万多个文件；但至少已经把启动前重复整包读 zip 的额外成本拿掉，并把下一轮排查入口收敛成明确的时间分段，而不是继续靠猜。正式版收尾阶段又顺手把 landing fallback、静态 HTML 结构化数据和线上部署地址对齐到了同一稳定包，避免“修复已上线但官网某些下载/抓取面仍指向旧版”的发布面漂移。
