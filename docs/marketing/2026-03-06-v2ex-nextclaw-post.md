# [开源] NextClaw：一个更好上手、兼容 OpenClaw 生态的本地 AI 助手

大家好，我是 NextClaw 的作者。

发这个帖，主要是想把项目讲清楚，也收集一轮真实反馈。

我自己的观察是：现在很多 OpenClaw 替代品更偏学习或二次开发。真到日常使用阶段，在体验和生态完整度上，经常会和 OpenClaw 拉开差距。NextClaw 想补的是这个空位：尽量保留 OpenClaw 生态兼容，同时把易用性做上去。

先说背景。NextClaw 是受 OpenClaw 启发做的，我们一直把 OpenClaw 当作很重要的参考。两边不是替代关系，更像两种取舍。

我理解的核心差异有四点。

1. OpenClaw 更像完整平台，能力非常全；NextClaw 更偏 UI-first，先解决"普通开发者怎么尽快跑起来"。
2. NextClaw 的主流程是 `nextclaw start` 后在 Web UI 里配置，不需要先研究很多命令和配置细节。
3. 我们把中文常见场景放在更前面，比如 QQ、飞书、企微、钉钉和对应文档。
4. 工程上我们坚持轻量，仓库代码量目前大约是 OpenClaw 的 1/20（同口径统计），这样迭代和维护更直接。

值得一试的理由：

1. 一行命令安装，界面化配置。对新手更友好，不需要先啃复杂命令行。
2. 自带 QQ、飞书等渠道支持，对国内用户更实用。
3. 兼容 OpenClaw 生态，迁移和复用成本更低。
4. 提供完整中文界面和中文文档。
5. 支持 Windows、macOS、Linux、云服务器和 Docker。
6. 代码开源，体量轻，当前代码量约为 OpenClaw 的 1/20。
7. 架构上坚持插件化拆分，目标是更可维护、更快迭代。

当前能力也补充一下：

1. 接多家模型服务：OpenRouter、OpenAI、Anthropic、Gemini、DeepSeek、Groq、MiniMax、Moonshot、DashScope、Zhipu、AiHubMix、vLLM。
2. 接多种消息渠道：Discord、Telegram、Slack、WhatsApp、飞书、钉钉、企业微信、QQ、Email、Mochat。
3. 做自动化：内置 Cron + Heartbeat，可以跑定时任务和后台任务。
4. 本地运行：配置、会话、密钥默认留在本机。
5. 用同一个 UI 管理聊天、Provider、渠道和技能配置。

如果你想快速搭一个可长期维护的个人 AI 中枢，这个项目可能适合你。

体验方式：

```bash
npm i -g nextclaw
nextclaw start
```

打开 `http://127.0.0.1:18791` 即可。

项目地址：

- GitHub: https://github.com/Peiiii/nextclaw
- 文档: https://docs.nextclaw.io/zh/
- 路线图: https://docs.nextclaw.io/zh/guide/roadmap

欢迎直接回帖提意见，尤其是你觉得最难用的一步是什么。
