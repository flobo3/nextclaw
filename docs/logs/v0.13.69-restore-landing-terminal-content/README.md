# v0.13.69-restore-landing-terminal-content

## 迭代完成说明（改了什么）

- 恢复官网首页终端展示与复制命令为原有内容（不再显示安装脚本风格输出）：
  - [`apps/landing/src/main.ts`](../../../apps/landing/src/main.ts)
  - 复制命令恢复为：`npm install -g nextclaw && nextclaw start`
  - 终端动效恢复为：
    - `npm install -g nextclaw`
    - `nextclaw start`
    - `UI: http://127.0.0.1:18791`
    - `API: http://127.0.0.1:18791/api`
- 已重新发布 landing 站点，使官网终端内容恢复到之前状态。

## 测试/验证/验收方式

- 构建验证：
  - `pnpm -C apps/landing build`
- 发布验证：
  - `pnpm deploy:landing`
  - Wrangler 回传部署地址：`https://73f06fff.nextclaw-landing.pages.dev`
- 打包产物验证（当前生效 bundle）：
  - 在 `apps/landing/dist/assets/main-BtsZk_P2.js` 中确认存在：
    - `npm install -g nextclaw && nextclaw start`
    - `nextclaw start`
  - 且不再使用安装脚本终端文案。

## 发布/部署方式

- 按现有流程发布 landing：
  - `pnpm --filter @nextclaw/landing build`
  - `pnpm deploy:landing`

## 用户/产品视角的验收步骤

1. 打开官网首页（中英文均可）。
2. 查看 Hero 区域终端模拟内容，应为原有 `npm install -g nextclaw` + `nextclaw start` 链路。
3. 点击“复制命令”，粘贴结果应为 `npm install -g nextclaw && nextclaw start`。
