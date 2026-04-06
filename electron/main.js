const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// Setup environment variables
const isDev = !app.isPackaged;
process.env.NODE_ENV = isDev ? 'development' : 'production';
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
let tray = null;
let isTracking = true;
let gameTracker = new GameTracker();
let updateService;
let serverInstance;

// Settings path
const settingsPath = path.join(app.getPath('userData'), 'background-settings.json');

// Background tracking settings with persistence
let backgroundSettings = {
  runInBackground: true,
  launchOnStartup: false
};

// Load settings on startup
try {
  if (fs.existsSync(settingsPath)) {
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    backgroundSettings = { ...backgroundSettings, ...saved };
    log.info('Loaded background settings:', backgroundSettings);
  }
} catch (err) {
  log.error('Failed to load background settings:', err);
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(backgroundSettings), 'utf8');
  } catch (err) {
    log.error('Failed to save background settings:', err);
  }
}

function startBackend() {
  try {
    serverInstance = startServer();
    log.info('Backend server started directly inside Electron');
  } catch (err) {
    log.error('Failed to start backend:', err);
  }
}

function createTray() {
  if (tray) return;

  // Use a more robust path for the tray icon
  const iconPath = isDev 
    ? path.join(__dirname, '../public/icon.png')
    : path.join(process.resourcesPath, 'app/public/icon.png');
  
  log.info('Tray icon path:', iconPath);
  
  let image;
  try {
    image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      // Fallback if the first path fails
      const fallbackPath = path.join(__dirname, '../public/icon.png');
      image = nativeImage.createFromPath(fallbackPath);
    }
  } catch (err) {
    log.error('Failed to load tray icon:', err);
  }

  tray = new Tray(image || iconPath);
  updateTrayMenu();

  tray.setToolTip('Game Tracker');
  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Uygulamayı Aç', 
      click: () => {
        mainWindow?.show();
      } 
    },
    { type: 'separator' },
    {
      label: isTracking ? '🟢 Takip Aktif' : '🔴 Takip Durduruldu',
      enabled: false
    },
    {
      label: isTracking ? 'İzlemeyi Durdur' : 'İzlemeyi Başlat',
      click: async () => {
        if (isTracking) {
          await gameTracker?.stop();
          isTracking = false;
        } else {
          gameTracker?.start();
          isTracking = true;
        }
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Çıkış Yap',
      click: () => {
        gameTracker?.setAuthToken(null);
        mainWindow?.webContents.send('force-logout');
        mainWindow?.show();
        updateTrayMenu();
      }
    },
    { 
      label: 'Tamamen Kapat', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow() {
  const iconPath = isDev 
    ? path.join(__dirname, '../public/icon.png')
    : path.join(process.resourcesPath, 'app/public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    backgroundColor: '#000000',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && backgroundSettings.runInBackground) {
      event.preventDefault();
      mainWindow.hide();
      // Optimize memory when hidden
      if (process.platform === 'win32') {
        app.setAppUserModelId(app.name);
      }
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock - Check this as early as possible
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.info('Another instance is already running, quitting...');
  app.quit();
  return; // Exit script execution
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  log.info('App Ready');
  
  startBackend();
  createWindow();
  createTray();

  // Apply auto-launch setting on startup
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: backgroundSettings.launchOnStartup,
      path: app.getPath('exe')
    });
  }
  
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
  if (process.platform !== 'darwin' && !backgroundSettings.runInBackground) {
    app.quit();
  }
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

ipcMain.handle('close-window', () => {
  if (backgroundSettings.runInBackground) {
    mainWindow?.hide();
  } else {
    mainWindow?.close();
  }
});

ipcMain.handle('set-background-tracking', (_, settings) => {
  backgroundSettings = { ...backgroundSettings, ...settings };
  saveSettings();
  
  // Handle Auto Launch
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: backgroundSettings.launchOnStartup,
      path: app.getPath('exe')
    });
  }
  
  return { success: true };
});

ipcMain.handle('set-auth-token', (_, token) => {
  gameTracker?.setAuthToken(token);
  return { success: true };
});

ipcMain.handle('get-background-tracking', () => {
  return backgroundSettings;
});

ipcMain.handle('logout', () => {
  gameTracker?.setAuthToken(null);
  return { success: true };
});

ipcMain.handle('set-discord-rpc', (_, enabled) => {
  gameTracker?.setDiscordRPC(enabled);
  return { success: true };
});

ipcMain.handle('set-user-settings', (_, settings) => {
  gameTracker?.setDisabledTrackingGames(settings?.privacy?.disabledTrackingGames);
  return { success: true };
});

ipcMain.handle('get-user-settings', async () => {
  return gameTracker?.getUserSettings() ?? null;
});

ipcMain.handle('get-supported-games', async () => {
  return Object.keys(gameTracker?.processMonitor?.gameProcesses || {});
});

ipcMain.handle('get-current-game', async () => {
  return gameTracker?.getCurrentSession() ?? null;
});

ipcMain.handle('set-health-notifications', (_, enabled) => {
  gameTracker?.setHealthNotifications(enabled);
  return { success: true };
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

ipcMain.handle('select-game-exe', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Oyun Dosyası', extensions: ['exe'] }
    ]
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('launch-game', async (_, exePath) => {
  if (!exePath) return { success: false, error: 'Dosya yolu bulunamadı.' };
  
  const { shell } = require('electron');
  const path = require('path');
  
  try {
    log.info(`Attempting Native Open: ${exePath}`);
    
    // shell.openPath is the primary recommendation for files
    let result = await shell.openPath(exePath);
    
    // If openPath returns an error string (failure), try openExternal which is even more abstract
    if (result) {
      log.warn(`openPath failed (${result}), trying openExternal fallback...`);
      // Converting path to file URL (handles spaces and special chars)
      const fileUrl = Buffer.from(path.resolve(exePath)).toString(); // Basic safety
      await shell.openExternal(`file:///${exePath.replace(/\\/g, '/')}`);
      result = ''; // Assume success if external didn't throw
    }
    
    return { success: !result, error: result };
  } catch (err) {
    log.error(`Launch exception: ${err.message}`);
    // If we're here, it's a structural error
    return { success: false, error: err.message };
  }
});
