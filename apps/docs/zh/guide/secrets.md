# 密钥管理（Secrets）

## 为什么要用 Secrets（而不是直接把 `apiKey` 写进配置）

如果你把 key 明文放在 `~/.nextclaw/config.json`，很容易在这些场景泄露：

- 截图
- 发配置给同事
- 误提交到 git

使用 secrets 后，配置文件只保存“引用关系”，真实值放在外部来源。

## 真实密钥到底存在哪里

- `env`：操作系统环境变量
- `file`：你指定的外部 JSON 文件
- `exec`：命令输出（可对接 vault 类系统）

`config.json` 中只存：

- `secrets.providers`
- `secrets.defaults`
- `secrets.refs`

## 典型使用场景

1. 团队共享一份配置模板：
配置里只留 refs，每个人在自己机器上放真实 key。

2. dev / staging / prod 多环境切换：
refs 不变，只换环境变量值。

3. 密钥轮换：
改外部密钥后 reload，不用手改业务配置路径。

## 小白可照抄的最小步骤

1. 创建 env provider 别名：

```bash
nextclaw secrets configure --provider env-main --source env --prefix APP_ --set-default
```

2. 把 OpenAI key 路径绑定为 ref：

```bash
nextclaw secrets apply \
  --path providers.openai.apiKey \
  --source env \
  --provider env-main \
  --id OPENAI_API_KEY
```

3. 设置真实 key 并审计：

```bash
export APP_OPENAI_API_KEY=sk-xxxxx
nextclaw secrets audit --strict
```

4. 重载：

```bash
nextclaw secrets reload
```

## UI 操作路径

打开 Web UI 的 `/secrets` 页面：

- 编辑 `enabled`
- 管理 `defaults`
- 管理 `providers`
- 管理 `refs`

保存后再执行 `nextclaw secrets audit --strict` 做最终验收。

## 旧方式还有效吗

有效。直接配置 `providers.<name>.apiKey` 仍可使用。

本地临时调试可以用旧方式；团队协作和生产环境建议使用 secrets refs。

