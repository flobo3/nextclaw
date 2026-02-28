# Secrets Management

## Why Use Secrets (Instead of Plain `apiKey` in Config)

If you put keys directly in `~/.nextclaw/config.json`, they are easy to leak in:

- screenshots
- copied config files
- accidental git commits

With secrets management, config only stores references. Real values stay in external sources.

## Where Real Secret Values Are Stored

- `env`: operating system environment variables
- `file`: an external JSON file you control
- `exec`: output of a command (for vault-like integrations)

`config.json` stores only:

- `secrets.providers`
- `secrets.defaults`
- `secrets.refs`

## Real-World Scenarios

1. Team sharing one config template:
Use refs in config, each teammate keeps real keys in local env variables.

2. Dev / staging / prod switching:
Keep the same refs, switch only environment variable values per environment.

3. Key rotation:
Update external key value, run reload, no need to rewrite business config.

## Quick Start (Beginner-Friendly)

1. Create an env provider alias:

```bash
nextclaw secrets configure --provider env-main --source env --prefix APP_ --set-default
```

2. Bind OpenAI API key path to a secret ref:

```bash
nextclaw secrets apply \
  --path providers.openai.apiKey \
  --source env \
  --provider env-main \
  --id OPENAI_API_KEY
```

3. Set real key and audit:

```bash
export APP_OPENAI_API_KEY=sk-xxxxx
nextclaw secrets audit --strict
```

4. Reload:

```bash
nextclaw secrets reload
```

## UI Workflow

Open `/secrets` in the Web UI:

- edit `enabled`
- manage `defaults`
- manage `providers`
- manage `refs`

Then run `nextclaw secrets audit --strict` as final acceptance.

## Is Old Style Still Valid?

Yes. Direct `providers.<name>.apiKey` still works.

Use direct key for quick local experiments.
Use secrets refs for team use, production, and safer operations.

