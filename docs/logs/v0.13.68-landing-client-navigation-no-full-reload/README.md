# v0.13.68-landing-client-navigation-no-full-reload

## 迭代完成说明（改了什么）
- 修复 `apps/landing` 在首页与下载页之间切换时的整页重载问题。
- 新增 `LandingApp` 作为轻量前端路由控制层，负责：
  - 监听站内链接点击并拦截为 `history.pushState` 导航（仅 `/en/`、`/zh/`、`/en/download/`、`/zh/download/`）。
  - 通过局部重渲染切换 `home/download` 视图，不触发浏览器整页刷新。
  - 处理浏览器前进/后退（`popstate`）与 hash 滚动。
- 调整语言切换行为：不再直接 `window.location.href` 整页跳转，改为走同一套前端导航逻辑。
- 顶部 Logo 改为可点击回首页，并走同页内导航。

## 测试/验证/验收方式
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm -C apps/landing build`
  - 结果：通过（`tsc` + `vite build` 成功）。
- 最小冒烟验证：
  - 启动预览：`PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm -C apps/landing preview --host 127.0.0.1 --port 4173`
  - 路由可达性检查：
    - `curl -fsS http://127.0.0.1:4173/en/`
    - `curl -fsS http://127.0.0.1:4173/en/download/`
    - `curl -fsS http://127.0.0.1:4173/zh/download/`
  - 结果：3 个页面均返回正确 HTML。
- 代码级行为确认：
  - `rg -n "window\.location\.href|window\.history\.pushState|handleRootNavigation|addEventListener\('popstate'" apps/landing/src/main.ts`
  - 结果：`window.location.href` 已移除；存在 `pushState` 与 `popstate` 处理逻辑。

## 发布/部署方式
- 前端常规发布流程（landing 站点）：
  - 本地验证通过后执行项目既有发布命令（例如 `pnpm deploy:landing`）。
- 本次改动仅影响 `apps/landing` 前端导航行为，无后端与数据库变更，无 migration。

## 用户/产品视角的验收步骤
1. 访问首页（如 `/en/` 或 `/zh/`）。
2. 点击“下载桌面版/Download Desktop”进入下载页。
3. 观察切换过程：页面应快速切换，地址栏更新为 `/xx/download/`，不出现明显整页白屏重载。
4. 在下载页点击浏览器“后退”，应返回首页且状态正常。
5. 在下载页点击导航中的“功能/社群”，应返回首页并定位到对应锚点区域。
