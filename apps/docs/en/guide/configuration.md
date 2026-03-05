# Configuration

This page is beginner-first: you do not need to edit config files to get started.

## 1. Start and open the UI

```bash
nextclaw start
```

Open `http://127.0.0.1:18791`.

## 2. Add one provider

Go to `Providers` and add one provider with a key you already have (OpenRouter or OpenAI is a good first choice).

Start with one provider only. Expand later.

## 3. Choose a default model

Go to `Models`, pick a default model, and save.

Need help choosing ids? See [Model Selection](/en/guide/model-selection).

## 4. Test connection and send first message

Use the UI test button, then send your first message once the test passes.

## 5. Add channels when ready

After local UI flow works, connect Discord/Telegram/Slack and others:

- [Channels](/en/guide/channels)
- [Tutorials](/en/guide/tutorials)

## How to read connection test failures

When UI shows "Connection test failed", check `status / method / endpoint / body` first:

- `404` + `POST /api/config/providers/<provider>/test`: local runtime is outdated; upgrade and retry.
- `401` / `403`: usually invalid/expired `apiKey` or wrong `extraHeaders`.
- `429`: provider rate limit; retry later or switch model/provider.
- `5xx`: upstream service error; retry and check gateway logs.
- `Non-JSON response`: body is not standard JSON; inspect returned body snippet.

## Advanced entry

If you need config files, secret refs, workspace templates, context budgets, or multi-agent setup:

- [Advanced Configuration](/en/guide/advanced)

## What to do next

- [What To Do After Setup](/en/guide/after-setup)
- [Resource Hub](/en/guide/resources)
