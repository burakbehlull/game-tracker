const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const GameTracker = require('./services/gameTracker');

let mainWindow;
let gameTracker;

// Initialize GameTracker
gameTracker = new GameTracker();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false, // Custom frame için
    backgroundColor: '#00000000', // Saydamlık için başlangıç rengi
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Development modunda Vite dev server, production'da build klasörü
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Start game tracker monitoring (waiting for token)
  gameTracker.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (gameTracker) {
    gameTracker.stop();
  }
});

// IPC Handlers - Window Controls
ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});

// IPC Handler - Auth Token Sink
ipcMain.handle('set-auth-token', (event, token) => {
  if (gameTracker) {
    gameTracker.setAuthToken(token);
    return { success: true };
  }
  return { success: false, error: 'GameTracker not initialized' };
});

ipcMain.handle('logout', async () => {
  if (gameTracker) {
    gameTracker.setAuthToken(null);
  }
  return { success: true };
});

// IPC Handlers - Game Status from Main Process
ipcMain.handle('get-current-game', async () => {
  if (gameTracker) {
    return gameTracker.getCurrentGame();
  }
  return null;
});

