const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const GameTracker = require('./services/gameTracker');
const url = require('url');

let mainWindow;
let gameTracker = new GameTracker();

const isDev = !app.isPackaged;
let backendProcess;

function startBackend() {
  const backendPath = isDev 
    ? path.join(__dirname, '../api/server.js')
    : path.join(process.resourcesPath, 'app/api/server.js');
  
  // Eğer production'da ise backend'i başlat
  // Dev modda zaten npm run dev içinde backend'i ayrı başlatıyor olabilirsiniz 
  // ya da burada da başlatabiliriz. Şu anki dev script'i backend'i başlatmıyor.
  // O yüzden her iki durumda da başlatalım.
  
  try {
    const { fork } = require('child_process');
    backendProcess = fork(backendPath, [], {
      env: { ...process.env, PORT: 3000 }
    });

    backendProcess.on('error', (err) => {
      console.error('Backend process error:', err);
    });

    console.log('Backend server started via fork');
  } catch (err) {
    console.error('Failed to start backend:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
  gameTracker.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  gameTracker?.stop();
  if (backendProcess) {
    backendProcess.kill();
  }
});

/* IPC */

ipcMain.handle('minimize-window', () => mainWindow?.minimize());

ipcMain.handle('maximize-window', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized()
    ? mainWindow.unmaximize()
    : mainWindow.maximize();
});

ipcMain.handle('close-window', () => mainWindow?.close());

ipcMain.handle('set-auth-token', (_, token) => {
  gameTracker?.setAuthToken(token);
  return { success: true };
});

ipcMain.handle('logout', () => {
  gameTracker?.setAuthToken(null);
  return { success: true };
});

ipcMain.handle('get-current-game', async () => {
  return gameTracker?.getCurrentGame() ?? null;
});
