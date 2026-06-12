'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('__ELECTRON__', true);
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: opts      => ipcRenderer.invoke('dialog:openFile', opts),
  saveFile: opts      => ipcRenderer.invoke('dialog:saveFile', opts),
  readBinary: p       => ipcRenderer.invoke('fs:readBinary', p),
  writeText: (p, t)   => ipcRenderer.invoke('fs:writeText', p, t),
  getVersion:      () => ipcRenderer.invoke('app:version'),
  checkForUpdate:  () => ipcRenderer.invoke('updater:check'),
  installUpdate:   () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus:  cb => ipcRenderer.on('updater', (_e, data) => cb(data)),
});
