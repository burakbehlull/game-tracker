const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getGameSessions: () => ipcRenderer.invoke('get-game-sessions'),
  getGameStats: () => ipcRenderer.invoke('get-game-stats'),
  getCurrentGame: () => ipcRenderer.invoke('get-current-game')
});

