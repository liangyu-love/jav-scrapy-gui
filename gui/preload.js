const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('javLauncher', {
  selectOutput: () => ipcRenderer.invoke('dialog:select-output'),
  openPath: (targetPath) => ipcRenderer.invoke('shell:open-path', targetPath),
  openExternal: (targetUrl) => ipcRenderer.invoke('shell:open-external', targetUrl),
  startCrawl: (args) => ipcRenderer.invoke('process:start-crawl', args),
  startUpdate: () => ipcRenderer.invoke('process:start-update'),
  stopProcess: () => ipcRenderer.invoke('process:stop'),
  loadResults: (targetPath) => ipcRenderer.invoke('results:load', targetPath),
  copyText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:save-file', defaultName),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', filePath, content),
  onProcessEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('process:event', listener);
    return () => ipcRenderer.removeListener('process:event', listener);
  }
});
