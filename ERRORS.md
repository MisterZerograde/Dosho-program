# Dosho Error Codes

Users see only the code (e.g. `Error: E001`). Details are here.

| Code | Where shown | Cause | How to investigate |
|------|------------|-------|--------------------|
| **E001** | Sync MT5 toast (red) | `/sync` fetch succeeded but the bridge returned a non-2xx HTTP status, or an unexpected JS exception occurred after the pre-check passed | Check bridge logs; the raw error is logged to the Electron console (`Ctrl+Shift+I` in dev build) |
| **E002** | Settings → Update section | `electron-updater` fired an error that is not a 404/ENOENT (those are silenced). Possible causes: network failure, corrupted download, code-signing mismatch | Raw message is logged via `console.error('[updater E002]', ...)` in main process; check DevTools or OS event log |
| **E003** | Share card status line | `canvas.toBlob()` failed, or both `ClipboardItem` write and the fallback `<a>` download threw an exception | Rare; usually a browser security policy blocking canvas export (e.g. tainted canvas from a cross-origin image). Check DevTools console for the underlying exception |
