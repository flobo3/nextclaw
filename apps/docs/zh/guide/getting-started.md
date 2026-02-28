# 快速开始

## 安装

```bash
npm i -g nextclaw
```

## 启动服务

后台启动网关 + 配置 UI：

```bash
nextclaw start
```

## 打开 UI

浏览器访问 **http://127.0.0.1:18791**，在 UI 中配置 Provider（如 OpenRouter）与默认模型。

## 初始化工作区（可选）

可执行 `nextclaw init` 生成模板，或直接使用 CLI 对话：

```bash
nextclaw agent -m "你好"
```

## 停止服务

```bash
nextclaw stop
```

## 下一步

- [配置](/zh/guide/configuration) — Provider、模型、工作区
- [密钥管理](/zh/guide/secrets) — 避免明文密钥，支持安全轮换
- [渠道](/zh/guide/channels) — 连接 Discord、Telegram、Slack 等
- [命令](/zh/guide/commands) — CLI 参考
