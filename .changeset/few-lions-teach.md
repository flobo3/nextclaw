---
"@nextclaw/server": patch
"nextclaw": patch
---

Replace the UI API CORS middleware with an explicit implementation to avoid the unstable `hono/cors` path on long-running Node servers.
