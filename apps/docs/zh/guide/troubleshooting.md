# 故障排查

## 常见问题

### 服务无法启动
- 先执行 `nextclaw status --json`，检查是否有残留进程占用端口
- 使用 `nextclaw status --fix` 清理残留服务状态
- 查看 `~/.nextclaw/logs/service.log` 获取错误详情

### 配置修改未生效
- 大部分配置路径支持热更新（providers、channels、model、tools、plugins）
- UI 端口变更需要 `nextclaw restart`
- 观察日志里的 `Config reload:` 记录确认热更新是否触发

### 渠道连不上
- 运行 `nextclaw channels status` 查看连接状态
- 检查 API token 是否正确
- Telegram 防火墙场景可配置 `"proxy": "http://localhost:7890"`

### Agent 无响应
- 执行 `nextclaw doctor --json` 做完整诊断
- 确认至少一个 provider 配置了有效 API key
- 确认当前模型在目标 provider 上可用

## 诊断命令

```bash
nextclaw status --json    # 机器可读状态；命令成功时退出 0，状态看 JSON 的 level 字段
nextclaw status --verbose # 详细状态
nextclaw doctor --json    # 全量诊断
nextclaw doctor --fix     # 自动修复常见问题
```

## 静默回复行为

- 模型输出包含 `<noreply/>` 时，不会向渠道发送回复
- 空字符串或全空白回复也不会发送
