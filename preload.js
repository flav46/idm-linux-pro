const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => ipcRenderer.send(channel, ...data),
  on: (channel, func) => ipcRenderer.on(channel, (e, ...args) => func(...args)),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data)
});
