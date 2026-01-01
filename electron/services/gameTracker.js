const ProcessMonitor = require('./processMonitor');
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

class GameTracker {
  constructor() {
    this.processMonitor = new ProcessMonitor();
    this.currentSession = null;
    this.checkInterval = null;
    this.lastGameState = false;
    this.authToken = null;
    this.apiUrl = process.env.VITE_API_URL || 'http://localhost:3000/api'; // Configurable
  }   

  setAuthToken(token) {
    this.authToken = token;
    console.log('Auth token set for GameTracker');
  }

  start() {
    console.log('Oyun takip servisi başlatıldı');
    this.checkInterval = setInterval(() => {
      this.checkGameStatus();
    }, this.processMonitor.checkInterval);
  } 

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Aktif oturumu sonlandır
    if (this.currentSession) {
      this.endSession();
    }
    
    console.log('Oyun takip servisi durduruldu');
  }

  async checkGameStatus() {
    const runningGame = await this.processMonitor.getRunningGameProcess();
    const isGameRunning = runningGame !== null;

    if (isGameRunning) {
      console.log(`[GameTracker] Tespit edilen oyun: ${runningGame.gameName}`);
    }

    // Oyun durumu veya oynanan oyun değişti mi?
    const currentRunningGameName = runningGame ? runningGame.gameName : null;
    const lastRunningGameName = this.currentSession ? this.currentSession.gameName : null;

    if (currentRunningGameName !== lastRunningGameName) {
      if (lastRunningGameName) {
        console.log(`[GameTracker] ${lastRunningGameName} bitti, oturum sonlandırılıyor...`);
        await this.endSession();
      }
      if (currentRunningGameName) {
        console.log(`[GameTracker] ${currentRunningGameName} başladı, oturum açılıyor...`);
        await this.startSession(runningGame);
      }
    }
    
    this.lastGameState = isGameRunning;
  }

  async startSession(gameInfo) {
    if (!this.authToken) {
      console.warn('[GameTracker] Kullanıcı giriş yapmamış (Auth Token eksik). Oyun süresi kaydedilmeyecek.');
      return;
    }

    try {
      console.log(`[GameTracker] API'ye oyun başlatma isteği gönderiliyor: ${gameInfo.gameName}`);
      const response = await fetch(`${this.apiUrl}/games/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          gameName: gameInfo.gameName,
          processName: gameInfo.processName
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.currentSession = {
          _id: data.sessionId,
          gameName: gameInfo.gameName,
          startTime: new Date(data.startTime),
          processName: gameInfo.processName
        };
        console.log(`[GameTracker] Başarılı: ${gameInfo.gameName} oturumu veritabanına kaydedildi.`);
      } else {
        const errorText = await response.text();
        console.error(`[GameTracker] API Hatası (Oturum Başlatma): ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[GameTracker] Ağ Hatası (Oturum Başlatma):', error);
    }
  }

  async endSession() {
    if (!this.currentSession || !this.authToken) {
      this.currentSession = null;
      return;
    }

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime - this.currentSession.startTime) / 1000);

      console.log(`[GameTracker] API'ye oturum sonlandırma isteği gönderiliyor: ${this.currentSession.gameName}, Süre: ${duration}s`);
      const response = await fetch(`${this.apiUrl}/games/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          sessionId: this.currentSession._id,
          duration: duration
        })
      });

      if (response.ok) {
        console.log(`[GameTracker] Başarılı: ${this.currentSession.gameName} oturumu kapatıldı.`);
      } else {
        const errorText = await response.text();
        console.error(`[GameTracker] API Hatası (Oturum Sonlandırma): ${response.status} - ${errorText}`);
      }
      
      this.currentSession = null;
    } catch (error) {
      console.error('[GameTracker] Ağ Hatası (Oturum Sonlandırma):', error);
      this.currentSession = null;
    }
  }

  getCurrentGame() {
    if (this.currentSession) {
      const now = new Date();
      const currentDuration = Math.floor((now - this.currentSession.startTime) / 1000);
      return {
        gameName: this.currentSession.gameName,
        startTime: this.currentSession.startTime,
        duration: currentDuration
      };
    }
    return null;
  }
}

module.exports = GameTracker;

