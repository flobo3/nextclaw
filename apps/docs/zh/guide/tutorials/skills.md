# Skills 教程（安装 + 使用）

本教程用最短路径跑通一次技能能力：安装 → 选择 → 生效。

## 1）安装一个 Skill

```bash
nextclaw skills install <slug>
```

示例：

```bash
nextclaw skills install weather
```

如果该 slug 在当前源不可用，替换为任意可安装的 skill 即可。

安装后可在工作区 `skills/<slug>/SKILL.md` 看到文件。

## 2）在 UI 里选择 Skill

1. 启动并打开 UI（默认 `http://127.0.0.1:18791`）。
2. 进入聊天页，在输入框下方点 `Skills`。
3. 勾选刚安装的 skill，再发送消息。

## 3）确认已生效

- 观察回复是否体现该 skill 的规则/格式约束。
- 取消勾选同一个 skill，再发一次同类问题，确认结果有可观察差异。

## 相关文档

- [对话能力](/zh/guide/chat)
- [教程总览](/zh/guide/tutorials)
- [命令](/zh/guide/commands)
