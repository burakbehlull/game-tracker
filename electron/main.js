const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mongoose = require('mongoose');
const GameTracker = require('./services/gameTracker');
const User = require('./models/User');
const GameSession = require('./models/GameSession');

let mainWindow;
let gameTracker;
let currentUserId = null;

// MongoDB bağlantısı
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
    width: 1400,
    height: 900,
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

// IPC Handlers - Authentication
ipcMain.handle('register', async (event, { username, password, email }) => {
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return { success: false, error: 'Bu kullanıcı adı zaten kullanılıyor' };
    }

    const user = new User({ username, password, email });
    await user.save();
    return { success: true, user: { id: user._id.toString(), username: user.username } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('login', async (event, { username, password }) => {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
    }

    user.lastLogin = new Date();
    await user.save();

    currentUserId = user._id.toString();
    
    // Oyun takip servisini başlat
    if (gameTracker) {
      gameTracker.stop();
    }
    gameTracker = new GameTracker(currentUserId);
    gameTracker.start();

    return { 
      success: true, 
      user: { 
        id: user._id.toString(), 
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('logout', async () => {
  if (gameTracker) {
    gameTracker.stop();
    gameTracker = null;
  }
  currentUserId = null;
  return { success: true };
});

ipcMain.handle('get-current-user', async () => {
  if (!currentUserId) return null;
  const user = await User.findById(currentUserId).select('-password');
  return user ? { id: user._id.toString(), username: user.username, email: user.email, createdAt: user.createdAt } : null;
});

// IPC Handlers - Game Sessions
ipcMain.handle('get-game-sessions', async () => {
  if (!currentUserId) return [];
  return await GameSession.find({ userId: currentUserId }).sort({ startTime: -1 }).limit(100);
});

ipcMain.handle('get-game-stats', async () => {
  if (!currentUserId) return [];
  const stats = await GameSession.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(currentUserId) } },
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

