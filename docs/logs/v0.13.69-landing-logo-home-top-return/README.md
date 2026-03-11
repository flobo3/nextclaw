# v0.13.69-landing-logo-home-top-return

## 迭代完成说明（改了什么）
- 修复 landing 页顶部 Logo 无法回到首页顶部的问题。
- 将 header Logo 从不可点击容器改为首页链接：`#home-link`。
- 新增 `bindHomeLinkAction()`：
  - 当当前路由是 `home` 时，点击 Logo 不再无效果，而是平滑滚动到页面最顶部。
  - 若当前 URL 带 hash（如 `#features`），会先移除 hash，再执行回顶，避免停留在锚点状态。
  - 当当前路由是 `download` 时，保持链接默认行为，返回首页。

## 测试/验证/验收方式
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm -C apps/landing build`
  - 结果：通过（`tsc + vite build` 成功）。
- 最小冒烟验证：
  - `PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm -C apps/landing preview --host 127.0.0.1 --port 4173`
  - `curl -fsS http://127.0.0.1:4173/en/ >/dev/null && echo EN_HOME_OK`
  - `curl -fsS http://127.0.0.1:4173/en/download/ >/dev/null && echo EN_DOWNLOAD_OK`
  - 结果：两个路由均可访问。
- 代码行为检查：
  - `rg -n "id=\"home-link\"|bindHomeLinkAction|window\.scrollTo\(\{ top: 0, left: 0, behavior: 'smooth' \}\)" apps/landing/src/main.ts`
  - 结果：首页 Logo 链接与回顶逻辑均存在。

## 发布/部署方式
- 按既有 landing 发布流程部署（例如 `pnpm deploy:landing`）。
- 本次仅为前端交互修复，无后端/数据库改动，不涉及 migration。

## 用户/产品视角的验收步骤
1. 打开首页（`/en/` 或 `/zh/`），向下滚动到中后段。
2. 点击左上角 Logo。
3. 预期：页面平滑回到首页最顶部。
4. 从下载页（`/en/download/` 或 `/zh/download/`）点击左上角 Logo。
5. 预期：返回首页顶部，可继续浏览 Hero 区域。
