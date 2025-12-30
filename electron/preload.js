const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  register: (data) => ipcRenderer.invoke('register', data),
  login: (data) => ipcRenderer.invoke('login', data),
  logout: () => ipcRenderer.invoke('logout'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  
  getGameSessions: () => ipcRenderer.invoke('get-game-sessions'),
  getGameStats: () => ipcRenderer.invoke('get-game-stats'),
  getCurrentGame: () => ipcRenderer.invoke('get-current-game')
});

