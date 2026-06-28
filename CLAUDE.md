# CLAUDE.md — Dosho Trading Journal

> This file is the single source of truth for how Claude works on this project.
> Read it fully at the start of every session before doing anything.

---

## 1. Who is the owner

- **Name / role:** Thai trader, acts as Product Manager
- **Coding level:** Zero — does not write or read code
- **Communication:** English (explain things simply, like talking to a smart friend who isn't a developer)
- **What the owner is good at:** Knowing exactly what they want the product to do, catching when something feels wrong, making product decisions fast

The owner is NOT responsible for technical decisions. Claude is.
The owner IS responsible for product direction. Claude follows that direction.

---

## 2. How we work together

| Role | Responsibility |
|------|---------------|
| **Owner** | Says what to build, approves direction, tests the result |
| **Claude** | Figures out how to build it, does the work, explains what happened |

**The golden rule:** The owner should never need to understand the code. They only need to understand the outcome.

---

## 3. Communication rules — MUST follow every session

1. **No jargon without a plain-language bracket.** Example: ✓ "XSS vulnerability (a security hole where someone could inject malicious code)" — not just "XSS vulnerability"
2. **Explain every change like this:** WHAT changed → WHY it matters → what the owner needs to do (if anything)
3. **One question at a time.** If Claude needs to ask something, ask the most important one only.
4. **When something breaks:** "X stopped working because Y. I fixed it by doing Z. You don't need to do anything."
5. **Status updates during long tasks:** short sentence every few steps so the owner isn't left wondering what's happening
6. **No option paralysis.** If there are more than 3 options, Claude picks the best one and explains why. If it's a real choice that matters to the product, present max 2 options with plain-language trade-offs.

---

## 4. Decision protocol

| Situation | Claude does |
|-----------|-------------|
| One clearly right answer | Just do it. Mention it after. |
| 2 valid options with real trade-offs | Present both in plain language, let owner choose |
| Risky/irreversible action (delete data, push to GitHub, change production) | **Always ask first, never assume** |
| Pure technical detail (which library, naming, code structure) | Claude decides, owner doesn't need to know |

---

## 5. Quality bar — what "professional production" means here

- **Working beats clever.** A simple solution that works is better than a sophisticated one that might break.
- **Don't break what already works.** Every fix must leave existing features intact.
- **Security matters.** This app handles real trading data. No shortcuts on security fixes.
- **Finish what you start.** No half-finished code. If a session ends mid-task, document exactly where it stopped in the session log.
- **Test mentally before declaring done.** Walk through the user flow in your head before saying it's complete.

### Definition of "done"

> Done = the feature works, the owner can see or use it, nothing else broke.
> Done ≠ "I wrote the code."

---

## 6. Release process (publishing a new version)

1. Make sure all changes are committed to git
2. Bump version number in `package.json` (patch = bug fix → x.x.**1**, minor = new feature → x.**1**.0)
3. Push commit to GitHub
4. Run build: `npm run build`
5. Publish requires `GH_TOKEN` environment variable set to a GitHub personal access token with `repo` scope
6. Command to build + publish: `electron-builder --win --x64 --publish always`

**Owner action needed:** Provide GH_TOKEN before any release.

---

## 7. Project overview — what Dosho is

Dosho is a **Windows desktop app** (built with Electron) for Thai traders to:
- Record and review MT5 trades
- See statistics: P&L, Win Rate, Profit Factor, Sharpe Ratio, Drawdown
- View a monthly P&L calendar
- Sync live data from MetaTrader 5 via the MT5 Bridge
- Manage multiple trading accounts

**Current version:** 1.4.0
**Target users:** Thai retail traders, including prop firm traders (e.g., 5%ers)

---

## 8. Architecture — how the project is structured

```
Dosho-app/
├── electron/
│   ├── main.js        — App startup, window, bridge launcher, IPC (inter-process communication)
│   └── preload.js     — Security bridge between app logic and system
├── renderer/
│   └── index.html     — The entire app UI + logic (~4,300 lines, vanilla JS)
├── mt5_bridge/
│   └── mt5_bridge.py  — Python server that talks to MetaTrader 5
├── assets/            — Icons, fonts, vendor JS (Chart.js)
├── build/             — Installer config
└── release/           — Built installer output (not in git)
```

**Key fact:** The entire user interface lives in one file — `renderer/index.html`. All JavaScript, CSS, and HTML is in that file. This is intentional for simplicity, even though it's large.

### How data is stored

All trade data lives in the browser's `localStorage` (local storage on the user's computer — no server, no cloud). Each account gets its own separate storage space.

```
dosho_accounts          — list of accounts
dosho_active_account    — which account is selected
dosho_trades            — trade history for active account
dosho_journal           — daily journal entries
dosho_checklist         — trading system rules
dosho_settings          — app settings
dosho_tags              — trade tags
```

### Trade object shape

```js
{ id, symbol, direction, openDt, closeDt, openPx, closePx, volume, pnl, tag, notes, commission, swap, source }
```
- `direction` is `'BUY'` or `'SELL'`
- `pnl` is net P&L after commission and swap
- `source` is `'manual'`, `'import'`, or `'sync'`

### Key functions in index.html

| Function | What it does (plain language) |
|---|---|
| `init()` | Starts the app — loads all data, draws everything |
| `calcStats(ts)` | Calculates all trading stats from a list of trades |
| `renderDashboard()` | Redraws the dashboard (KPI cards, charts) |
| `renderCalendar()` | Redraws the monthly calendar |
| `renderTradeTable()` | Redraws the trade list |
| `renderReports()` | Redraws the reports panel |
| `persist()` | Saves current trades to local storage |
| `saveTrade()` | Saves a new or edited trade from the form |
| `switchPanel()` | Switches between dashboard / trades / journal / reports / settings |

### After any data change, always call

```js
renderDashboard(); renderCalendar(); renderTradeTable(); renderReports();
```

### MT5 Bridge

The bridge is a Python Flask server running on `http://127.0.0.1:5678` (local machine only).
- Connects to MetaTrader 5 and fetches trade history
- The Electron app calls `/sync` to get trades, then passes them to the renderer
- CORS is restricted to localhost only (security fix applied Jun 2026)

---

## 9. Known constraints and decisions

| Decision | Reason |
|---|---|
| Single HTML file for renderer | Simplicity — no build step, easy to understand |
| localStorage only (no server) | Privacy — user's trades never leave their machine |
| Windows only | MT5 Bridge requires Windows; MetaTrader 5 is Windows software |
| Thai UI language | Target users are Thai traders |
| Vanilla JS (no React/Vue) | Keeps the project simple, no dependencies to break |

---

## 10. What NOT to do

- Do NOT split `renderer/index.html` into separate files without a full migration plan (high risk of breaking things)
- Do NOT add a backend server or cloud sync without explicit owner approval
- Do NOT use `innerHTML` with unescaped user input — always use `escapeHtml()` first
- Do NOT use bare `JSON.parse()` without wrapping in `safeJsonParse()` — corrupted data must not crash the app
- Do NOT push to GitHub or publish a release without owner confirming the version number

---

## 11. Session log

Every session is logged here. Most recent at the top.

---

### Session 4 — 2026-06-28
**Owner request:** Create a working structure with .md files so Claude and the owner always have the same vision. Includes session log, project memory, and a reusable template for future projects.

**What was done:**
- Rewrote `CLAUDE.md` (this file) with full project context, working rules, communication guidelines, decision protocol, and architecture docs
- Created `.claude/session-log.md` as a standalone session history file
- Created `C:\Users\COMPUTER\Desktop\_claude-project-template\CLAUDE.md` as a reusable template for future projects

**Decisions made:** Claude picked the structure and format — owner confirmed direction via goal prompt.

---

### Session 3 — 2026-06-28
**Owner request:** Push a release (new version) to GitHub.

**What was done:**
- Confirmed git status: 7 files modified, on master branch, remote = `git@github.com:MisterZerograde/Dosho-program.git`
- Identified that `GH_TOKEN` is not set in the environment — required for publishing
- Session paused: owner needs to provide version number and set GH_TOKEN before publishing can proceed

**Pending:** Version bump (currently 1.4.0 → needs decision on 1.4.1 or 1.5.0) + GH_TOKEN

---

### Session 2 — 2026-06-28
**Owner request:** Fix all the professional/quality issues found in the audit — do it all in one session, not split across time periods.

**What was done (18 fixes across 6 files):**

*Security:*
- Fixed CORS in MT5 Bridge — was open to any website, now restricted to localhost only
- Added `escapeHtml()` helper and applied it to all places where user data was displayed (trade symbols, notes, tag names, account names) — prevents XSS attacks
- Removed `Access-Control-Allow-Private-Network: true` header that was allowing external sites to access the local bridge

*Bug fixes:*
- Removed duplicate `getTradingDayKey()` and `getTradingMonthKey()` functions — the first copy was being silently overridden
- Added `parseNum()` helper — `parseFloat()` was returning `NaN` (not a number) when form fields were empty, which was being saved as trade data
- Sync function now checks the renderer function exists before calling it — previously could crash if called before app loaded

*Resilience:*
- Added `safeJsonParse()` helper replacing all bare `JSON.parse()` calls — corrupted localStorage no longer crashes the app
- Bridge EXE not found → now shows a toast notification to the user
- Sync failure in background → now shows a toast notification
- autoUpdater crash on error → now handled gracefully

*Code quality:*
- Added named constants: `MS_PER_DAY`, `MS_PER_HOUR`, `PF_ARC_LEN` replacing unexplained numbers
- Electron version pinned with `~` instead of `^` to prevent breaking updates

*Project structure:*
- Expanded `.gitignore` to cover backups, Python cache, env files, editor files
- Created `README.md` with setup, build, and architecture documentation
- Created `.eslintrc.json` with linting rules

**Files changed:** `renderer/index.html`, `electron/main.js`, `electron/preload.js`, `mt5_bridge/mt5_bridge.py`, `package.json`, `.gitignore` + new files `README.md`, `.eslintrc.json`

---

### Session 1 — 2026-06-28
**Owner request:** "I want to make this project professional — list all things you see that you can make better in terms of coding or project structure."

**What was done:** Full audit of the Dosho-app project. Found and documented 20 issues across security, code quality, error handling, project structure, and configuration.

**Audit findings summary:**
- 3 Critical security issues (CORS open to all, XSS via innerHTML, unguarded JSON.parse)
- 5 High code quality issues (monolithic file, duplicate functions, float precision, no types, bad parseFloat)
- 4 Medium error handling issues (silent sync failures, no bridge warning, unhandled promises)
- 5 Medium structure issues (no README, no LICENSE, backup dirs in repo, no ESLint, no tests)
- 3 Low issues (magic numbers, mixed naming, loose electron version pin)

**Decision:** Owner asked why fixes were split across time periods → agreed to do all fixable items in one session (Session 2).
