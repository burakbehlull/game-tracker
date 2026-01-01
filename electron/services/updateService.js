const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');
const log = require('electron-log');

// Log seviyesini ayarla (hata ayıklama için önemli)
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

class UpdateService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupListeners();
  }

  setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      console.log('[Update] Güncelleme kontrol ediliyor...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[Update] Yeni güncelleme bulundu:', info.version);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('[Update] Uygulama güncel.');
    });

    autoUpdater.on('error', (err) => {
      console.error('[Update] Güncelleme hatası:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "İndirme hızı: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - İndirilen: %' + progressObj.percent;
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log('[Update]', log_message);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[Update] Güncelleme indirildi. Yeniden başlatma onayı isteniyor.');
      
      dialog.showMessageBox({
        type: 'info',
        title: 'Güncelleme Hazır',
        message: 'Yeni versiyon (' + info.version + ') başarıyla indirildi. Güncellemeyi uygulamak için uygulama yeniden başlatılsın mı?',
        buttons: ['Şimdi Yeniden Başlat', 'Sonra']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  checkForUpdates() {
    // Geliştirme modunda güncellemeleri kontrol etme (hata verebilir)
    if (!app.isPackaged) {
      console.log('[Update] Geliştirme modunda güncelleme kontrolü atlanıyor.');
      return;
    }
    
    autoUpdater.checkForUpdatesAndNotify();
  }
}

module.exports = UpdateService;
