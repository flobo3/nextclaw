# Skills Tutorial (Install + Use)

This is the shortest path to run skills end-to-end: install -> select -> verify.

## 1) Install one skill

```bash
nextclaw skills install <slug>
```

Example:

```bash
nextclaw skills install weather
```

If this slug is unavailable in your registry, replace it with any installable skill.

After install, you should see `skills/<slug>/SKILL.md` in your workspace.

## 2) Select the skill in UI

1. Start and open UI (default `http://127.0.0.1:18791`).
2. Open chat page and click `Skills` under the input box.
3. Select the installed skill, then send a message.

## 3) Verify it is applied

- Check whether the response follows that skill's rules/format.
- Unselect the same skill and send a similar prompt again to compare.

## Related docs

- [Chat Capabilities](/en/guide/chat)
- [Tutorial Hub](/en/guide/tutorials)
- [Commands](/en/guide/commands)
