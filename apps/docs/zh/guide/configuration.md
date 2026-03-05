# 配置

默认按“新手路径”来：你不需要先改配置文件，直接在 UI 里完成即可。

## 1. 启动并打开 UI

```bash
nextclaw start
```

浏览器访问 `http://127.0.0.1:18791`。

## 2. 添加 Provider

进入 `Providers`，先添加一个你已有 Key 的提供商（推荐先用 OpenRouter 或 OpenAI）。

建议先只配 1 个 Provider，跑通后再扩展。

## 3. 选择默认模型

进入 `Models`，选择默认模型并保存。

如需挑模型，参考：[模型选型](/zh/guide/model-selection)。

## 4. 测试连接并发第一条消息

在 UI 中点击连接测试，确认通过后直接发第一条消息。

## 5. 需要时再接入渠道

当本地 UI 跑通后，再去接 Discord/Telegram/Slack 等渠道：

- [渠道](/zh/guide/channels)
- [教程](/zh/guide/tutorials)

## 测试连接失败怎么判断

当 UI 提示“连接测试失败”时，优先看 `status / method / endpoint / body`：

- `404` + `POST /api/config/providers/<provider>/test`：本地运行版本过旧，先升级再试。
- `401` / `403`：通常是 `apiKey` 错误、过期，或 `extraHeaders` 配置不正确。
- `429`：提供商限流，稍后重试或换模型/提供商。
- `5xx`：上游服务异常，先重试并看网关日志。
- `Non-JSON response`：返回不是标准 JSON，重点看 body 片段。

## 进阶用户入口

如果你需要配置文件、Secrets refs、工作区模板、上下文预算、多 Agent 等高级能力，见：

- [进阶配置](/zh/guide/advanced)

## 配置完成后的下一步

- [配置后做什么](/zh/guide/after-setup)
- [生态资源](/zh/guide/resources)
