const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  setAuthToken: (token) => ipcRenderer.invoke('set-auth-token', token),
  register: (data) => ipcRenderer.invoke('register', data),
  login: (data) => ipcRenderer.invoke('login', data),
  logout: () => ipcRenderer.invoke('logout'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  
  // Game Sessions
  getGameSessions: () => ipcRenderer.invoke('get-game-sessions'),
  getGameStats: () => ipcRenderer.invoke('get-game-stats'),
  getCurrentGame: () => ipcRenderer.invoke('get-current-game'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});

