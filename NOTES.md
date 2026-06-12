# Dosho — Agent Notes

This file is maintained by the AI agent. Updated after every significant change.
If anything is unclear or missing, the agent will ask before proceeding.

---

## App Vision

Dosho is a **Thai-language desktop trading journal** for retail forex/gold traders.
Target user: Thai traders using MetaTrader 5 (MT5), primarily trading XAUUSD.

**Core philosophy:**
- Simple, fast, local-first (no server, no account, no internet required for core features)
- All data in `localStorage` — no database
- Single HTML file SPA (`renderer/index.html`) — no framework, no build step
- Electron wrapper for file dialogs, auto-updater, native OS integration

**Key UX principles:**
- Thai language throughout (labels, messages, dates)
- Dark and light theme support
- Mobile-friendly share card (9:16) for posting performance to social media
- No clutter — trades and stats, nothing else

---

## Architecture

| Layer | File | Notes |
|---|---|---|
| Main process | `electron/main.js` | Window, IPC, auto-updater |
| Preload | `electron/preload.js` | Exposes safe APIs to renderer |
| Renderer | `renderer/index.html` | Entire app — HTML + CSS + JS (~4000 lines) |
| Build config | `package.json` | electron-builder, NSIS installer |
| Installer hook | `build/installer.nsh` | Kills running Dosho before install |
| CI | `.github/workflows/build-app.yml` | Builds + publishes on `v*` tag push |

**Renderer structure:** `<style>` block → `<body>` HTML shell → `<script>` block.
No modules, no bundler, no transpilation.

**Assets (local, not CDN):**
- `assets/fonts/mitr.css` + font files — Thai UI font
- `assets/vendor/chart.umd.min.js` — Chart.js for radar/equity charts
- `assets/icon.ico`, `assets/tray-icon.png` — app icons

---

## IPC Channels

| Channel | Direction | Purpose |
|---|---|---|
| `dialog:openFile` | renderer→main | Native file open dialog |
| `dialog:saveFile` | renderer→main | Native file save dialog |
| `fs:readBinary` | renderer→main | Read binary file (MT5 HTML import) |
| `fs:writeText` | renderer→main | Write text file (backup export) |
| `app:version` | renderer→main | Get current app version string |
| `bridge:sync` | renderer→main | Trigger MT5 bridge sync manually |
| `updater:check` | renderer→main | Check for update now |
| `updater:install` | renderer→main | Quit and install downloaded update |
| `updater` | main→renderer | Update status events (IPC event, not handle) |

---

## Feature History

### v1.0.x — Core app
- Trade journal, calendar heatmap, reports, accounts, daily journal
- MT5 CSV/HTML import
- localStorage persistence

### v1.1.0 — Auto-updater
- `electron-updater` with manual "Check for Update" button in Settings
- Progress bar, install button

### v1.1.1 — Share card v1
- "แชร์" button on dashboard period bar
- Canvas-drawn PNG: logo + PnL hero + 4 stats + calendar heatmap + equity sparkline
- Free date range picker + quick period pills
- Copy to clipboard / fallback download

### v1.1.2 — Redesigned share card
- Both heatmap AND equity curve side-by-side (800×540)
- GitHub-style adaptive heatmap (cell size scales with period length)
- `fix: disable auto-install on quit` so closing the app just closes it

### v1.1.3 — Share card toggles
- Layout toggle: **16:9** (800×540 desktop) / **9:16** (540×960 mobile)
- Theme toggle: **มืด** (dark) / **สว่าง** (light/white)
- Persists layout+theme across opens within same session

### v1.1.4 — Update fix (critical)
- `electron-builder` was creating **draft** releases → `latest.yml` returned 404 → updater never found updates
- Fixed: added `"releaseType": "release"` to publish config
- Added `gh release edit --draft=false` step to workflow as safety net
- Added `app:version` IPC + dynamic version display in Settings

### v1.1.5 — Remove tray and background mode
- No system tray icon
- Closing the window now quits the app (was: hide to tray)
- MT5 bridge no longer auto-starts — user opens it manually
- Removed: `Tray`, `Menu`, `nativeImage`, `treeKill`, `spawn` from main.js
- Added: `bridge:sync` IPC + `syncBridge` in preload for future manual sync button

### v1.1.7 — (broken release — missing latest.yml, skip)
- CI uploaded .exe + .blockmap but not latest.yml — updater cannot find this version
- Bumped straight to v1.1.8 to fix the update chain

### v1.1.6 — In-app update notification
- Orange dot on "การตั้งค่า" nav item when update starts downloading
- Green dot when download is complete (persists until restart)
- Toast notification slides in top-right when update is ready
- Toast has "ไปที่การตั้งค่า →" button, auto-dismisses after 12s
- DevTools: F12 or Ctrl+Shift+I in dev mode (`npm start`)

---

## CI/CD

- **Trigger:** push to `master` → build only (no publish). Push `v*` tag → build + publish to GitHub Releases.
- **Publish:** `electron-builder --publish always` + `gh release edit --draft=false`
- **MT5 bridge:** downloaded from GitHub `latest` release during CI. If not found, build continues without it.
- **Release assets:** `Dosho Setup X.Y.Z.exe` + `latest.yml` (required by electron-updater)
- **To release:** bump `version` in `package.json`, commit, `git tag vX.Y.Z`, `git push origin master && git push origin vX.Y.Z`

---

## Known Issues / Watch Out

- **No code signing** — updates work (hash-verified by `latest.yml`) but Windows may show SmartScreen warning on first install
- `tree-kill` is still in `package.json` dependencies but no longer used — harmless, can clean up later
- Share card `_fmtHeroPnl()` uses `getCurrencySymbol()` which appends symbol after number (e.g. `+485.65¢`) — this is intentional for the user's broker format
- The renderer `window._bgSyncTrades()` function must exist for `bridge:sync` IPC to work — it's defined in the renderer's MT5 sync section

---

## Things To Ask Before Doing

- Any change to the data schema (trade object shape, localStorage keys) — could break existing user data
- Removing or renaming any IPC channel — renderer and main must stay in sync
- Adding new npm dependencies — user prefers minimal deps
- Any change that affects the installer/update flow — test carefully
- UI language changes — everything is Thai, keep it that way
