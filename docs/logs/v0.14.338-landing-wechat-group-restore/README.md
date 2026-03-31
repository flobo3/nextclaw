# v0.14.338 Landing WeChat Group Restore

## 迭代完成说明（改了什么）
- 修复 landing 首页“加入社群”入口误指向 QQ 群的问题：
  - 将 [`apps/landing/src/main.ts`](/Users/peiwang/Projects/nextbot/apps/landing/src/main.ts) 中的 `wechatGroupImage` 从 QQ 群二维码切回微信群二维码 `'/contact/nextclaw-contact-wechat-group.png'`。
  - 将首页 Hero CTA、社区区块、页脚入口的中英文文案统一从 `QQ群 / QQ Group` 改回 `微信群 / WeChat Group`。
  - 将社区说明与二维码标签同步修正，避免按钮、弹窗、社区 section 三处信息不一致。
- 为满足仓库治理规则，顺手把 `LandingPage` 中本次触达 class 的实例方法统一改为箭头 class field；仅为治理收尾，不改变页面行为。
- 同批次补充：将 landing/docs 站点实际使用的 `logo.svg` 叠加 `🐾` emoji（右下角），与当前前端品牌图标视觉保持一致。

## 测试/验证/验收方式
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/landing tsc`
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/landing build`
- 可维护性与新代码治理：
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：通过；仅保留历史性 warning，不属于本次新增阻塞项。
- 前端冒烟：
  - 本地预览：`PATH=/opt/homebrew/bin:$PATH pnpm -C apps/landing preview --host 127.0.0.1 --port 4173`
  - 页面可达：`curl -I http://127.0.0.1:4173/zh/`
  - 资源可达：`curl -I http://127.0.0.1:4173/contact/nextclaw-contact-wechat-group.png`
  - 构建产物检查：`rg -n "WeChat Group|加入微信群|微信群二维码|nextclaw-contact-wechat-group" apps/landing/dist -S`
  - 结果：中文首页预览返回 `200`，微信二维码资源返回 `200`，构建产物命中微信文案与资源路径。
- 图标资源检查（本次补充）：
  - `rg -n "🐾" apps/landing/public/logo.svg apps/docs/public/logo.svg`
  - 结果：两处 `logo.svg` 均命中 paw emoji 叠加层。

## 发布/部署方式
- 本次仅完成本地修复与验证，未执行正式发布。
- 如需上线 landing，执行前端发布流程：
  - `pnpm deploy:landing`

## 用户/产品视角的验收步骤
1. 打开中文 landing 首页 `/zh/`。
2. 确认首页绿色按钮显示为“加入微信群”，而不是“加入QQ群”。
3. 点击该按钮，确认弹出的二维码为微信群二维码。
4. 下滑到社区 section，确认左侧卡片标题为“微信群二维码”，页脚入口也显示“微信群”。
5. 英文页 `/en/` 同样确认对应入口显示为 `WeChat Group`。
6. 打开任一 landing/docs 页面标签页，确认浏览器页签图标为原图标叠加右下角 `🐾`。
