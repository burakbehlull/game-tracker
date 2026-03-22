const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

// Setup environment variables
const isDev = !app.isPackaged;
const envPath = isDev 
  ? path.join(__dirname, '../.env') 
  : path.join(process.resourcesPath, '.env');

require('dotenv').config({ path: envPath });

const GameTracker = require('./services/gameTracker');
const UpdateService = require('./services/updateService');
const startServer = require('../api/server');

// Configure Logger
log.transports.file.level = 'info';
log.transports.console.format = '{h}:{i}:{s} {text}';
log.transports.console.level = 'info';
log.info('App starting...');

let mainWindow;
let gameTracker = new GameTracker();
let updateService;
let serverInstance;

function startBackend() {
  try {
    serverInstance = startServer();
    log.info('Backend server started directly inside Electron');
  } catch (err) {
    log.error('Failed to start backend:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    backgroundColor: '#000000',
    icon: path.join(__dirname, '../public/icon.png'),
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
  log.info('App Ready');
  startBackend();
  createWindow();
  
  try {
    gameTracker.start();
    if (gameTracker.discordService) {
      gameTracker.discordService.connect();
    }
    log.info('GameTracker service started.');
  } catch (e) {
    log.error('Error starting GameTracker:', e);
  }
  
  // Update service
  try {
    updateService = new UpdateService(mainWindow);
    updateService.checkForUpdates();
  } catch (e) {
    log.error('Error starting UpdateService:', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let isQuitting = false;
app.on('before-quit', async (e) => {
  if (!isQuitting) {
    e.preventDefault();
    isQuitting = true;
    
    log.info('App closing, cleaning up...');
    
    if (gameTracker) {
      await gameTracker.stop();
    }
    
    if (serverInstance) {
      serverInstance.close();
    }
    
    app.quit();
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
  return gameTracker?.getCurrentSession() ?? null;
});

ipcMain.handle('check-admin-status', async () => {
  if (!gameTracker || !gameTracker.processMonitor) return false;
  return await gameTracker.processMonitor.isAdmin();
});

ipcMain.handle('set-session-limit', (_, minutes) => {
  gameTracker?.setSessionLimit(minutes);
  return { success: true };
});

ipcMain.handle('start-update-download', () => {
  updateService?.downloadUpdate();
  return { success: true };
});

ipcMain.handle('install-update', () => {
  updateService?.quitAndInstall();
  return { success: true };
});
