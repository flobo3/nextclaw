# v0.13.70-landing-install-mode-tabs

## 迭代完成说明（改了什么）
- 调整首页 Hero 区域安装入口布局：第一行升级为三选项入口（`Desktop Download` / `npm Install` / `Docker Install`），第二行保留 `Docs` 与 `GitHub`。
- `Desktop Download` 入口改为直接跳转现有下载页路由（`/en/download/` 或 `/zh/download/`），不做系统识别分流。
- 新增安装模式切换逻辑（npm / Docker）：
  - 选中态按钮高亮切换。
  - 终端动画首行命令随模式切换。
  - 复制按钮内容随模式切换。
- Docker 一键命令接入为：`curl -fsSL https://nextclaw.io/install-docker.sh | bash`。

## 测试/验证/验收方式
- 类型检查：`PATH=/opt/homebrew/bin:$PATH pnpm -C apps/landing tsc`
- 构建验证：`PATH=/opt/homebrew/bin:$PATH pnpm -C apps/landing build`
- 前端冒烟（Playwright 自动化）：
  - 本地起预览服务 `pnpm -C apps/landing preview --host 127.0.0.1 --port 4173`
  - 校验点：
    - Desktop 入口链接为下载页路由。
    - npm/Docker 切换后，终端命令文案正确切换。
    - 复制按钮在不同模式下复制对应命令。
    - 切回 npm 后按钮激活态正确恢复。
  - 结果：`SMOKE_OK`

## 发布/部署方式
- 本次仅本地实现与验证，未执行发布。
- 后续如需上线，按前端发布流程执行（构建产物来自 `apps/landing`）。

## 用户/产品视角的验收步骤
1. 打开首页（中英文均可），确认安装入口第一行展示 Desktop / npm / Docker 三选项。
2. 点击 Desktop，确认直接进入对应语言下载页。
3. 点击 Docker，观察终端命令切换为 `curl -fsSL https://nextclaw.io/install-docker.sh | bash`。
4. 点击复制按钮，确认复制内容为 Docker 命令。
5. 再切回 npm，确认终端命令与复制内容恢复为 `npm install -g nextclaw && nextclaw start`。
