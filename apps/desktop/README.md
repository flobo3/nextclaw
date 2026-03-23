# @nextclaw/desktop

Electron desktop shell for NextClaw.

## Scripts

- `pnpm -C apps/desktop dev`: build desktop main/preload and run Electron.
- `pnpm -C apps/desktop build`: build desktop runtime bundle (`dist/`).
- `pnpm -C apps/desktop dist`: build desktop artifacts with electron-builder.
- `pnpm -C apps/desktop smoke`: run non-GUI runtime smoke test.

## Notes

- `build:main` uses `tsc` emit (no bundling). This avoids bundling Electron's runtime loader into `dist/main.js`.
- `dev` will auto-check `nextclaw/dist`. If missing, it auto-runs `pnpm -C packages/nextclaw build`.
- `pack` / `dist` will auto-ensure `nextclaw-ui` + `nextclaw` runtime artifacts before packaging.
- If you see `Electron failed to install correctly`, first run:
  - `PATH=/opt/homebrew/bin:$PATH pnpm install`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop build`
  - then retry `PATH=/opt/homebrew/bin:$PATH pnpm dev:desktop`

## Release Modes

### 1) Validate before release

Run all checks from repo root:

- `PATH=/opt/homebrew/bin:$PATH pnpm build`
- `PATH=/opt/homebrew/bin:$PATH pnpm lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop smoke`

Optional runtime smoke:

- `PATH=/opt/homebrew/bin:$PATH pnpm dev:desktop`

Expected startup logs include:

- `Channels enabled: ...`
- `UI API: http://0.0.0.0:<port>/api`
- `UI frontend: http://0.0.0.0:<port>`

### 2) Build desktop artifacts

macOS unsigned (current default in CI):

- `PATH=/opt/homebrew/bin:$PATH CSC_IDENTITY_AUTO_DISCOVERY=false pnpm -C apps/desktop dist -- --mac dmg zip --publish never`

macOS signed/notarized (optional):

- same command as above, but provide signing/notarization credentials in environment.

Windows (unpacked EXE directory, no publish):

- `PATH=/opt/homebrew/bin:$PATH CSC_IDENTITY_AUTO_DISCOVERY=false pnpm -C apps/desktop exec electron-builder --win dir --x64 --publish never`

### 3) Artifacts to upload

All artifacts are under `apps/desktop/release`:

- `NextClaw Desktop-<version>-arm64.dmg`
- `NextClaw Desktop-<version>-arm64-mac.zip`
- `NextClaw Desktop-<version>-x64.dmg`
- `NextClaw Desktop-<version>-x64-mac.zip`
- `win-unpacked/NextClaw Desktop.exe`

### 4) Optional macOS signing credentials

- `CSC_LINK`, `CSC_KEY_PASSWORD` for Developer ID Application certificate.
- `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `APPLE_API_KEY` for notarization.
- If missing, release can still proceed in unsigned mode.
