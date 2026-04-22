const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, net } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const dns = require('dns');

// Fix for Node.js ERR_INTERNAL_ASSERTION / internalConnectMultiple
// This forces Node to prefer IPv4 and prevents the crash
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Setup environment variables
const isDev = !app.isPackaged;
process.env.NODE_ENV = isDev ? 'development' : 'production';

// Set App User Model ID for Windows Notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('com.gametracker.app');
}

// Only load .env in development mode
if (isDev) {
  const envPath = path.join(__dirname, '../.env');
  require('dotenv').config({ path: envPath });
  log.info('Loaded .env from:', envPath);
} else {
  // In production, use environment variables or defaults
  // These should be set via system environment or installer
  log.info('Production mode: Using system environment variables');
  
  // Set default values if not provided
  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://localhost:27017/gametracker';
  }
  if (!process.env.JWT_SECRET) {
    // Generate a random secret if not provided (not recommended for production)
    log.warn('JWT_SECRET not set! Using generated secret (not recommended for production)');
    process.env.JWT_SECRET = require('crypto').randomBytes(64).toString('hex');
  }
}

// 2. Global Error Handling - Show dialog in production
process.on('uncaughtException', (error) => {
  log.error('CRITICAL: Uncaught Exception:', error);
  if (app.isPackaged) {
    dialog.showErrorBox('Uygulama Hatası', error.message || 'Bilinmeyen bir hata oluştu.');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Single Instance Lock - Check this early
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.info('Another instance is already running, quitting...');
  app.quit();
  process.exit(0);
}

// Lazy load services to prevent startup crashes
let GameTracker, UpdateService, startServer;

function loadServices() {
  try {
    log.info('Loading services...');
    GameTracker = require('./services/gameTracker');
    UpdateService = require('./services/updateService');
    startServer = require('../api/server');
    log.info('Services loaded successfully');
    return true;
  } catch (err) {
    log.error('FAILED to load services:', err);
    if (app.isPackaged) {
      dialog.showErrorBox('Servis Hatası', 'Uygulama servisleri başlatılamadı: ' + err.message);
    }
    return false;
  }
}

// Configure Logger
log.transports.file.level = 'info';
log.transports.console.format = '{h}:{i}:{s} {text}';
log.transports.console.level = 'info';
log.info('App starting...');

let mainWindow;
let tray = null;
let isTracking = true;
let isQuitting = false; // Moved to top
let gameTracker; 
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

  log.info('Creating tray...');
  
  try {
    let image = nativeImage.createFromPath(iconPath);
    
    if (image.isEmpty()) {
      log.warn('[Main] createFromPath failed, trying buffer-based loading');
      try {
        const buffer = fs.readFileSync(iconPath);
        image = nativeImage.createFromBuffer(buffer);
      } catch (err) {
        log.error('[Main] Buffer-based loading failed');
      }
    }

    // Final base64 fallback (a simple blue circle with 'G') if everything else fails
    if (image.isEmpty()) {
      log.warn('[Main] All file-based loading failed, using embedded base64 fallback');
      const base64Icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAZklEQVRYR2NgGAWjYBSMglEwCkbBSAcMA8XGhv8zSInBByYGBgYpYvRCDYBrYOBgg9mDLAfAGkgqYIDZg0wHwBrIKmCA2YMMB8AayCpgwEAZpC47YMANUuYdMApGwSgYBaNgFIyC4QEA0WwIBfPBaA0AAAAASUVORK5CYII=';
      image = nativeImage.createFromDataURL(base64Icon);
    }

    const trayIcon = image.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    
    updateTrayMenu();

    tray.setToolTip('Game Tracker');
    
    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    });
    
    log.info('Tray created successfully');
  } catch (err) {
    log.error('CRITICAL: Failed to create tray:', err);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Uygulamayı Göster', 
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      } 
    },
    { type: 'separator' },
    { 
      label: 'Ana Sayfa', 
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('nav-to-home');
      } 
    },
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

// Use a more robust way to get the icon path
const getIconPath = () => {
  const appPath = app.getAppPath();
  const locations = [
    path.resolve(appPath, 'public/icon.png'),
    path.resolve(appPath, 'electron/icon.png'),
    path.resolve(appPath, 'assets/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, 'icon.png')
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      log.info('[Main] Found icon at:', loc);
      return loc;
    }
  }
  
  log.error('[Main] Icon not found in any location!');
  return path.join(__dirname, 'icon.png'); // Final fallback
};

const iconPath = getIconPath();

function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    return;
  }

  log.info('Creating window...');
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1000,
      minHeight: 700,
      frame: false,
      backgroundColor: '#000000',
      icon: iconPath,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      show: true // Force show in production to debug if it's not showing
    });

    // Fallback to show window if ready-to-show never fires
    const showTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        log.warn('ready-to-show timeout, forcing show');
        mainWindow.show();
      }
    }, 5000);

    if (isDev) {
      mainWindow.loadURL('http://localhost:5173');
    } else {
      const indexPath = path.join(__dirname, '../dist/index.html');
      log.info('Loading production file from:', indexPath);
      
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath).catch(err => {
          log.error('Failed to load file:', err);
          mainWindow.show();
        });
      } else {
        log.error('Production index.html NOT FOUND at:', indexPath);
        const fallbackPath = path.join(process.resourcesPath, 'app/dist/index.html');
        if (fs.existsSync(fallbackPath)) {
           mainWindow.loadFile(fallbackPath);
        } else {
          dialog.showErrorBox('Dosya Hatası', 'Uygulama dosyaları (index.html) bulunamadı.');
        }
      }
    }

    mainWindow.once('ready-to-show', () => {
      clearTimeout(showTimeout);
      log.info('Window ready-to-show');
      mainWindow.show();
      mainWindow.focus();
    });

    mainWindow.on('close', (event) => {
      // Only hide if we are NOT quitting and background mode is enabled AND tray exists
      if (!isQuitting && backgroundSettings.runInBackground && tray) {
        event.preventDefault();
        mainWindow.hide();
        log.info('[Main] Window closed to tray');
        return false;
      }
    });

    mainWindow.on('minimize', (event) => {
      if (backgroundSettings.runInBackground && tray) {
        event.preventDefault();
        mainWindow.hide();
        log.info('[Main] Window minimized to tray');
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (err) {
    log.error('Failed to create window:', err);
  }
}

app.whenReady().then(() => {
  log.info('App Ready');
  
  // 1. Create window and tray as soon as possible
  createWindow();
  createTray();

  // 2. Load services and start backend (delayed to keep UI responsive)
  setTimeout(() => {
    if (loadServices()) {
      try {
        gameTracker = new GameTracker();
        gameTracker.start();
        if (gameTracker.discordService) {
          gameTracker.discordService.connect();
        }
        
        startBackend();
        
        if (mainWindow) {
          updateService = new UpdateService(mainWindow);
          setTimeout(() => {
            updateService.checkForUpdates();
          }, 5000);
        }
        log.info('Background services started successfully');
      } catch (err) {
        log.error('Error starting GameTracker:', err);
      }
    }
  }, 500);
});

app.on('second-instance', () => {
  log.info('Second instance detected');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !backgroundSettings.runInBackground) {
    app.quit();
  }
});

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

ipcMain.handle('minimize-window', () => {
  if (backgroundSettings.runInBackground && tray) {
    mainWindow?.hide();
  } else {
    mainWindow?.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized()
    ? mainWindow.unmaximize()
    : mainWindow.maximize();
});

ipcMain.handle('close-window', () => {
  log.info(`[Main] close-window handle. Background tracking: ${backgroundSettings.runInBackground}, Tray: ${!!tray}`);
  
  if (backgroundSettings.runInBackground && tray) {
    mainWindow?.hide();
    log.info('[Main] Window hidden to tray');
  } else {
    log.info('[Main] Closing window completely (background mode off or tray missing)');
    isQuitting = true;
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
