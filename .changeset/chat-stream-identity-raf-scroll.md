---
'@nextclaw/agent-chat-ui': patch
'@nextclaw/ncp-toolkit': patch
'@nextclaw/ui': patch
---

Improve chat stream rendering performance by preserving stable message identities for unchanged messages and batching sticky autoscroll work with requestAnimationFrame.
