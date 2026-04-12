# [开源] NextClaw，功能更新：微信 clawbot、远程访问、codex、claude code、开启认证

> 历史补录说明：
> 这篇文案未在当时录入仓库，现根据作者保留的 V2EX 发帖内容补录。
> 发帖时间为 `2026-03-24`，作为后续宣传规划的真实时间基线。

大家好，前段时间我在 V2EX 分享过我的开源项目 NextClaw, 《NextClaw：一个更好上手、更好看、部分兼容 OpenClaw 生态的本地 AI 助手》。

目前两周多过去了，NextClaw 也更新了不少新功能，在这里分享、推广一下最新进展。

## 简单介绍

NextClaw 是一个类 OpenClaw 产品。市场上已经有众多 `xxxClaw`，NextClaw 的亮点如下：

1. 快速上手，不像 OpenClaw 需要繁琐的命令行配置，NextClaw 可以通过命令一键安装启动，仅需在界面中配置好模型 `apiKey` 即可使用。
2. 跨平台安装/部署，支持 Windows、macOS、Linux，也可以在云服务器、Docker 中部署使用。
3. 国内友好，自带微信、飞书、QQ 等国内渠道，不需额外安装配置插件即可使用。
4. 美观简洁的界面，NextClaw 把 UI 作为主要的使用入口，重点优化。
5. 开源开放，所有代码包括配套设施完全开源，渠道、模型提供商、skill、mcp、插件等皆可拓展。

官网：

- https://nextclaw.io/

GitHub 地址：

- https://github.com/Peiiii/nextclaw/

## 新增功能

1. 微信 clawbot 集成：无需安装插件，直接扫描即可连接微信，参考腾讯官方的 OpenClaw 插件实现。
2. 远程访问：给每个 NextClaw 实例分配一个域名，从而可以在任意设备通过浏览器访问。
3. 授权分享：基于远程访问，可以创建授权分享链接，其他人可以通过此分享链接进行访问。支持撤销授权。
4. `codex`：安装 Codex 插件，即可在 NextClaw 使用 `codex-sdk` 能力。
5. `claude code`：安装 Claude Code 插件，即可在 NextClaw 中使用 `claude-agent-sdk` 的能力。
6. 开启认证：支持在启动后设置管理员用户名和密码，便于云服务器部署等场景使用。

备注：

- `codex` 当时只支持 GPT 系列模型。
- `codex / claude code` 功能当时仍有不足，计划继续优化。

## 快速体验

得益于远程访问和授权分享能力，当时提供了一个运行在 Docker 中的实例，供大家通过浏览器直接体验，无需配置 `apiKey` 等操作。

分享链接：

- https://platform.nextclaw.io/share/lTVd-TLUe1Sb1nGFfFBoLaJ5ejC-HC8A

## 加入群聊

创建了一个 NextClaw / OpenClaw 产品交流群，讨论话题不限于本产品，可以通过官网的加入微信群扫码进群。

## 截图

- `mmexport1774318258070.png`
- `mmexport1774318260141.png`
- `mmexport1774318255768.png`
- `mmexport1774318262430.png`
- `mmexport1774318264448.png`

## 附言（2026-03-24）

快速体验：

```bash
npm i -g nextclaw@latest
nextclaw start
```

然后复制输出的 URL 在浏览器打开，配置一下模型 `apiKey` 就可以用了。
