# v0.13.127-file-naming-guide-and-ui-dist-sync

## 迭代完成说明（改了什么）
- 新增 `docs/workflows/file-naming-convention.md`，沉淀仓库文件命名约定，明确角色后缀、测试文件命名与渐进迁移策略。
- 更新 `README.md` 的 GitHub planning docs 区域，补充对文件命名规范文档的入口链接。
- 同步更新 `packages/nextclaw/ui-dist` 构建产物与 `index.html` 资源指向，保证前端分发目录引用最新 hash 资源。

## 测试/验证/验收方式
- `git diff --check`（通过）
- `rg -n "File Naming Convention" README.md`（通过，确认 README 已暴露新文档入口）
- `node -e "const fs=require('fs');const html=fs.readFileSync('packages/nextclaw/ui-dist/index.html','utf8');const refs=[...html.matchAll(/(?:src|href)=\\\"(\\/assets\\/[^\\\"]+)\\\"/g)].map((m)=>m[1].slice(1));const missing=refs.filter((ref)=>!fs.existsSync('packages/nextclaw/ui-dist/'+ref));if(missing.length){console.error(missing.join('\\n'));process.exit(1)}console.log('verified',refs.length)"`（通过，确认 `index.html` 引用的 3 个前端产物均存在）
- 不适用：`build` / `lint` / `tsc`。本次工作区仅包含文档入口调整与已生成的 `ui-dist` 产物同步，未触达可编译源码或类型链路。

## 发布/部署方式
- 如需随版本发布，沿用仓库既有前端发布流程，将本次 `ui-dist` 与文档改动一并纳入版本。
- 若后续重新生成前端产物，需确保 `packages/nextclaw/ui-dist/index.html` 中的资源 hash 与 `assets/` 目录保持一致。
- 不适用：远程 migration、后端部署。本次未涉及数据库或服务端运行逻辑。

## 用户/产品视角的验收步骤
1. 打开仓库根目录 `README.md`，确认 GitHub planning docs 区域可直接进入 File Naming Convention 文档。
2. 阅读 `docs/workflows/file-naming-convention.md`，确认命名规则、角色后缀和测试命名约定完整可用。
3. 打开 `packages/nextclaw/ui-dist/index.html`，确认引用的是当前 `assets/` 目录中真实存在的最新打包文件。
