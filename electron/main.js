'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path    = require('path');
const http    = require('http');
const fs      = require('fs');
const { spawn } = require('child_process');
const treeKill  = require('tree-kill');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

const BRIDGE_URL = 'http://127.0.0.1:5678';

let win           = null;
let rendererReady = false;
let bridgeProc    = null;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── Bridge auto-launch ────────────────────────────────────────────────────────
async function launchBridgeIfNeeded() {
  try { await httpGet(`${BRIDGE_URL}/status`, 1500); return; } catch {}
  const exePath = app.isPackaged
    ? path.join(process.resourcesPath, 'mt5_bridge.exe')
    : path.join(__dirname, '..', 'mt5_bridge', 'dist', 'mt5_bridge.exe');
  if (!fs.existsSync(exePath)) return;
  bridgeProc = spawn(exePath, ['--headless'], { detached: false, stdio: 'ignore', windowsHide: true });
  bridgeProc.on('exit', () => { bridgeProc = null; });
}

// ── Bridge sync (triggered manually from renderer) ────────────────────────────
async function doSync() {
  if (!win || !rendererReady) return;
  try {
    const data = await httpGet(`${BRIDGE_URL}/sync`, 20000);
    const imported = data.trades || [];
    await win.webContents.executeJavaScript(
      `window._bgSyncTrades(${JSON.stringify(imported)})`
    );
  } catch (e) {
    console.error('[sync]', e.message);
  }
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 840, minWidth: 960, minHeight: 640,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.on('context-menu', e => e.preventDefault());
  win.webContents.setVisualZoomLevelLimits(1, 1);
  win.webContents.on('before-input-event', (event, input) => {
    if (!app.isPackaged) {
      if (input.key === 'F12') { win.webContents.openDevTools(); return; }
      if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') { win.webContents.openDevTools(); return; }
    }
    if (app.isPackaged) {
      if (input.key === 'F5') { event.preventDefault(); return; }
      if ((input.control || input.meta) && input.key.toLowerCase() === 'r') { event.preventDefault(); return; }
    }
    if (!(input.control || input.meta)) return;
    if (['+', '-', '=', '0'].includes(input.key)) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('file://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) { event.preventDefault(); shell.openExternal(url); }
  });
  win.webContents.on('did-finish-load', () => { rendererReady = true; });
  win.once('ready-to-show', () => win.show());
  win.on('close', () => app.quit());
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.on('before-quit', () => {
  if (bridgeProc && bridgeProc.pid) { treeKill(bridgeProc.pid); bridgeProc = null; }
});

app.whenReady().then(() => {
  launchBridgeIfNeeded();
  createWindow();

  ipcMain.handle('dialog:openFile', (_, opts) => dialog.showOpenDialog(win, opts));
  ipcMain.handle('dialog:saveFile', (_, opts) => dialog.showSaveDialog(win, opts));
  ipcMain.handle('fs:readBinary',   (_, p)    => fs.readFileSync(p));
  ipcMain.handle('fs:writeText',    (_, p, t) => fs.writeFileSync(p, t, 'utf-8'));
  ipcMain.handle('app:version',     ()        => app.getVersion());
  ipcMain.handle('bridge:sync',     ()        => doSync());

  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    const sendUpdate = (type, data) => { if (win) win.webContents.send('updater', { type, ...data }); };
    autoUpdater.on('checking-for-update',  ()  => sendUpdate('checking', {}));
    autoUpdater.on('update-available',     (i) => sendUpdate('available', { version: i.version }));
    autoUpdater.on('update-not-available', ()  => sendUpdate('not-available', {}));
    autoUpdater.on('download-progress',    (p) => sendUpdate('progress', { percent: Math.floor(p.percent) }));
    autoUpdater.on('update-downloaded',    (i) => sendUpdate('downloaded', { version: i.version }));
    autoUpdater.on('error',                (e) => sendUpdate('error', { msg: e.message }));

    ipcMain.handle('updater:check',   () => autoUpdater.checkForUpdates());
    ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall());

    autoUpdater.checkForUpdates();
  }
});

app.on('window-all-closed', () => app.quit());
