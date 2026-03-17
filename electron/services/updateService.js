const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');
const log = require('electron-log');

// Log seviyesini ayarla (hata ayıklama için önemli)
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

class UpdateService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    // Otomatik indirmeyi kapatıyoruz (User chooses to download)
    autoUpdater.autoDownload = false;
    autoUpdater.logger = log;
    this.setupListeners();
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('CHECKING_FOR_UPDATE');
    });

    autoUpdater.on('update-available', (info) => {
      this.sendStatusToWindow('UPDATE_AVAILABLE', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      this.sendStatusToWindow('UPDATE_NOT_AVAILABLE');
    });

    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('UPDATE_ERROR', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendStatusToWindow('DOWNLOAD_PROGRESS', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('UPDATE_DOWNLOADED', info);
    });
  }

  sendStatusToWindow(status, data = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  checkForUpdates() {
    if (!app.isPackaged) {
      log.info('[Update] Geliştirme modunda güncelleme kontrolü atlanıyor.');
      return;
    }
    autoUpdater.checkForUpdates();
  }

  downloadUpdate() {
    autoUpdater.downloadUpdate();
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}

module.exports = UpdateService;
