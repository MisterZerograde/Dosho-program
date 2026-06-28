# Dosho — บันทึกการเทรด (Trading Journal)

Electron desktop app for Thai traders to record, analyze, and review MT5 trades.

## Features

- Trade log with P&L, direction, tags, notes
- Dashboard: Net P&L, Profit Factor, Win Rate, R:R, Sharpe, Drawdown
- Monthly P&L calendar
- MT5 Bridge auto-sync (real-time from MetaTrader 5)
- Multi-account support
- Dark / Light theme
- CSV & HTML report import

## Requirements

- Node.js 18+
- Windows 10/11 (MT5 Bridge requires Windows)
- MetaTrader 5 (for live sync)

## Development

```bash
npm install
npm start          # run in dev mode (F12 opens DevTools)
```

## Build

```bash
npm run build      # produces installer in release/
```

## MT5 Bridge

The bridge (`mt5_bridge/mt5_bridge.py`) is a Flask server that connects to MetaTrader 5 on `127.0.0.1:5678`.

```bash
pip install MetaTrader5 flask flask-cors pystray Pillow
python mt5_bridge/mt5_bridge.py
```

In production the bridge is bundled as `mt5_bridge.exe` (built with PyInstaller).

## Architecture

```
electron/main.js      — Electron main process, bridge launcher, IPC
electron/preload.js   — Context bridge (renderer ↔ main)
renderer/index.html   — Entire SPA (JS + CSS + HTML, vanilla)
mt5_bridge/           — Python Flask bridge to MetaTrader 5
assets/               — Icons, fonts, vendor JS
```

All trade data is stored in `localStorage` (namespaced per account).

## License

MIT
