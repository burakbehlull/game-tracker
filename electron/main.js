const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mongoose = require('mongoose');
const GameTracker = require('./services/gameTracker');
const ProcessMonitor = require('./services/processMonitor');

let mainWindow;
let gameTracker;

mongoose.connect('mongodb://localhost:27017/gametracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB bağlantısı başarılı');
}).catch(err => {
  console.error('MongoDB bağlantı hatası:', err);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  gameTracker = new GameTracker();
  gameTracker.start();
}

app.whenReady().then(() => {
  createWindow();

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

// IPC Handlers
ipcMain.handle('get-game-sessions', async () => {
  const GameSession = require('./models/GameSession');
  return await GameSession.find().sort({ startTime: -1 }).limit(100);
});

ipcMain.handle('get-game-stats', async () => {
  const GameSession = require('./models/GameSession');
  const stats = await GameSession.aggregate([
    {
      $group: {
        _id: '$gameName',
        totalTime: { $sum: '$duration' },
        sessionCount: { $sum: 1 },
        lastPlayed: { $max: '$endTime' }
      }
    },
    { $sort: { totalTime: -1 } }
  ]);
  return stats;
});

ipcMain.handle('get-current-game', async () => {
  if (gameTracker) {
    return gameTracker.getCurrentGame();
  }
  return null;
});

