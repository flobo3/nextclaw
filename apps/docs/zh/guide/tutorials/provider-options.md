# 安装后第一步：选择模型接入方式（无截图版）

如果你刚安装完 NextClaw，不知道先做什么，这一页只解决一件事：
**先把第一个可用模型接起来。**

## 你将完成什么

1. 在 30 秒内选定接入路径（Qwen Portal 或 API Key）。
2. 按步骤完成一次可用配置。
3. 发送一条测试消息，确认链路可用。

## 前置条件

- 已安装 NextClaw。
- 本机可访问 `http://127.0.0.1:18791`。
- 若走 API Key 路径，需要有对应厂商账号。

## 30 秒决策：选哪条路

| 路径 | 是否需要手动 API Key | 上手速度 | 可能限制 | 适合谁 |
| --- | --- | --- | --- | --- |
| Qwen Portal | 否 | 最快 | 可能有额度/频率限制 | 先快速跑通 |
| 厂商 API Key（MiniMax 示例） | 是 | 略慢 | 取决于你的厂商账户与套餐 | 长期稳定使用 |

## 路径 A：Qwen Portal（免手动 API Key）

1. 启动服务：
   ```bash
   nextclaw start
   ```
2. 浏览器打开：`http://127.0.0.1:18791`。
3. 进入 `Providers`，选择 `Qwen Portal`。
4. 点击 `浏览器授权`，在弹出的页面完成登录与授权。
5. 回到 NextClaw，选择模型并发送测试消息：
   ```text
   请只回复：QWEN-OK
   ```

预期结果：返回 `QWEN-OK`（或语义等价的简短回复）。

详细流程见：[Qwen Portal 免费配置教程（小白版）](/zh/guide/tutorials/qwen-portal)

## 路径 B：厂商 API Key（以 MiniMax 为例）

说明：`MiniMax` 只是示例，不是强绑定。你也可以使用 OpenAI / OpenRouter / DeepSeek 等。

### Step 1. 进入 MiniMax 控制台

按账号区域选择入口：

- 海外：`https://platform.minimax.io`
- 中国区：`https://platform.minimaxi.com`

### Step 2. 登录并创建 API Key

登录后进入“接口密钥（Interface Key）”页面：

- 海外直达：`https://platform.minimax.io/user-center/basic-information/interface-key`
- 中国区直达：`https://platform.minimaxi.com/user-center/basic-information/interface-key`

点击创建密钥（常见文案为 `Create new secret key` 或“创建新的 API Key”），复制并安全保存。

### Step 3. 充值并确认余额可用（关键）

在同一控制台进入 `Billing / Wallet / 余额` 页面，完成充值或套餐开通，并确认余额大于 0。

建议：

1. 充值后先刷新页面，确认余额状态已更新。
2. 如果是新账号，先跑一次最小额度验证，避免后续因余额不足报错。

### Step 4. 在已打开的 NextClaw 页面进入 MiniMax

默认你已经打开了 NextClaw 页面（`http://127.0.0.1:18791`）。

按这个路径进入：`设置 -> 提供商 -> 全部提供商 -> MiniMax`。

### Step 5. 填写 MiniMax 配置

- `API Key`：粘贴刚创建的 key
- `API Base`：按区域填写
  - 中国区：`https://api.minimaxi.com/v1`
  - 海外：`https://api.minimax.io/v1`

### Step 6. 测试连接并保存

1. 点击 `测试连接`。
2. 显示通过后点击 `保存`。

### Step 7. 选择默认模型

1. 进入 `Model` 页面。
2. 选择：`minimax/MiniMax-M2.5`。
3. 点击保存。

### Step 8. 发送验证消息

进入对话页发送：

```text
请只回复：PROVIDER-OK
```

预期结果：返回 `PROVIDER-OK`（或语义等价的简短回复）。

## 验证通过标准

满足以下三项即可认为配置完成：

1. `Providers` 页测试连接成功。
2. `Model` 页保存成功且默认模型已生效。
3. 对话页能返回测试消息预期内容。

## 常见错误对照

- `401 / 403`：API Key 错误、过期，或账号区域与 `API Base` 不匹配。
- `429`：上游限流，稍后重试或切换模型。
- `402` / `insufficient_balance`：账户余额不足或套餐未开通，先完成充值再重试。
- `404`（provider test endpoint）：本地 NextClaw 版本过旧，先升级。
- `5xx`：上游服务异常，先重试并观察日志。

## 下一步

1. [配置后做什么](/zh/guide/after-setup)
2. [模型选型指南](/zh/guide/model-selection)
3. [渠道](/zh/guide/channels)
