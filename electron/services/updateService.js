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
    autoUpdater.allowPrerelease = true; // Allow pre-releases if needed
    autoUpdater.logger = log;
    
    // GitHub için ek konfigürasyon (Cache sorunlarını önlemek için)
    autoUpdater.requestHeaders = {
      'Cache-Control': 'no-cache'
    };
    
    this.setupListeners();
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      log.info('[Update] Checking for updates...');
      this.sendStatusToWindow('CHECKING_FOR_UPDATE');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('[Update] Update available:', info);
      this.sendStatusToWindow('UPDATE_AVAILABLE', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('[Update] No update available');
      this.sendStatusToWindow('UPDATE_NOT_AVAILABLE');
    });

    autoUpdater.on('error', (err) => {
      log.error('[Update] Update error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.sendStatusToWindow('UPDATE_ERROR', errorMessage);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      log.info(`[Update] Download progress: ${progressObj.percent}%`);
      this.sendStatusToWindow('DOWNLOAD_PROGRESS', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('[Update] Update downloaded:', info);
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
