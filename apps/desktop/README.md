# @nextclaw/desktop

Electron desktop shell for NextClaw.

## Scripts

- `pnpm -C apps/desktop dev`: build desktop main/preload and run Electron.
- `pnpm -C apps/desktop build`: build desktop runtime bundle (`dist/`).
- `pnpm -C apps/desktop dist`: build installer artifacts with electron-builder.
- `pnpm -C apps/desktop smoke`: run non-GUI runtime smoke test.

## Notes

- `build:main` uses `tsc` emit (no bundling). This avoids bundling Electron's runtime loader into `dist/main.js`.
- `dev` will auto-check `nextclaw/dist`. If missing, it auto-runs `pnpm -C packages/nextclaw build`.
- If you see `Electron failed to install correctly`, first run:
  - `PATH=/opt/homebrew/bin:$PATH pnpm install`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop build`
  - then retry `PATH=/opt/homebrew/bin:$PATH pnpm dev:desktop`
