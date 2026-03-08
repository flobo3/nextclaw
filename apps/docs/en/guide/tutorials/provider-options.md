# First Step After Install: Choose Your Provider Path (No Screenshots)

If you just installed NextClaw and are not sure what to do first, this page solves one thing:
**connect your first working model path.**

## What you will finish

1. Choose a provider path in 30 seconds (Qwen Portal or API key).
2. Complete one working setup with clear steps.
3. Send one test message to verify end-to-end success.

## Prerequisites

- NextClaw is installed.
- You can open `http://127.0.0.1:18791` locally.
- For API key path, you have a vendor account.

## 30-second decision

| Path | Manual API key required | Setup speed | Possible limits | Best for |
| --- | --- | --- | --- | --- |
| Qwen Portal | No | Fastest | May have quota/rate limits | First successful run quickly |
| Vendor API key (MiniMax example) | Yes | Slightly slower | Depends on your vendor plan | Stable long-term usage |

## Path A: Qwen Portal (no manual API key)

1. Start service:
   ```bash
   nextclaw start
   ```
2. Open `http://127.0.0.1:18791`.
3. Go to `Providers` and select `Qwen Portal`.
4. Click `Authorize in Browser`, then finish login/authorization.
5. Return to NextClaw, choose a model, and send:
   ```text
   Please reply exactly: QWEN-OK
   ```

Expected result: `QWEN-OK` (or an equivalent short response).

Full walkthrough: [Qwen Portal Setup Tutorial (Beginner-Friendly)](/en/guide/tutorials/qwen-portal)

## Path B: Vendor API key (MiniMax as example)

Note: `MiniMax` is only an example, not a lock-in path. You can use OpenAI / OpenRouter / DeepSeek and others.

### Step 1. Open MiniMax console

Pick by account region:

- Global: `https://platform.minimax.io`
- Mainland China: `https://platform.minimaxi.com`

### Step 2. Login and create API key

After login, go to Interface Key page:

- Global direct link: `https://platform.minimax.io/user-center/basic-information/interface-key`
- CN direct link: `https://platform.minimaxi.com/user-center/basic-information/interface-key`

Create a key (often shown as `Create new secret key`), then copy and store it securely.

### Step 3. Top up and confirm available balance (critical)

In the same console, open `Billing / Wallet / Balance`, complete top-up or plan activation, and confirm balance is greater than 0.

Recommendations:

1. Refresh once after top-up to ensure balance status is updated.
2. For new accounts, run a minimal usage check first to avoid later balance-related failures.

### Step 4. In the already-open NextClaw page, navigate to MiniMax

Assume NextClaw UI is already open at `http://127.0.0.1:18791`.

Use this path: `Settings -> Providers -> All Providers -> MiniMax`.

### Step 5. Fill MiniMax fields

- `API Key`: paste the key you created
- `API Base`: set by region
  - CN: `https://api.minimaxi.com/v1`
  - Global: `https://api.minimax.io/v1`

### Step 6. Test connection and save

1. Click `Test Connection`.
2. If successful, click `Save`.

### Step 7. Set default model

1. Go to `Model`.
2. Select `minimax/MiniMax-M2.5`.
3. Save.

### Step 8. Send verification message

In chat, send:

```text
Please reply exactly: PROVIDER-OK
```

Expected result: `PROVIDER-OK` (or an equivalent short response).

## Success checklist

You are done when all three are true:

1. Provider test passes.
2. Model save succeeds and default model is active.
3. Chat returns expected test response.

## Common errors

- `401 / 403`: wrong/expired key, or region mismatch with `API Base`.
- `429`: upstream rate limit, retry later or switch model.
- `402` / `insufficient_balance`: no available balance or plan not activated; top up first.
- `404` (provider test endpoint): local NextClaw version is outdated.
- `5xx`: upstream service issue, retry and check logs.

## Next

1. [What To Do After Setup](/en/guide/after-setup)
2. [Model Selection Guide](/en/guide/model-selection)
3. [Channels](/en/guide/channels)
