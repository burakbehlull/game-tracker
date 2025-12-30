const ProcessMonitor = require('./processMonitor');

class GameTracker {
  constructor() {
    this.processMonitor = new ProcessMonitor();
    this.currentSession = null;
    this.checkInterval = null;
    this.lastGameState = false;
    this.authToken = null;
    this.apiUrl = 'http://localhost:3000/api'; // Configurable
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

    // Oyun durumu değişti mi?
    if (isGameRunning !== this.lastGameState) {
      if (isGameRunning && !this.currentSession) {
        // Oyun başladı
        await this.startSession(runningGame);
      } else if (!isGameRunning && this.currentSession) {
        // Oyun bitti
        await this.endSession();
      }
      this.lastGameState = isGameRunning;
    }
  }

  async startSession(gameInfo) {
    if (!this.authToken) {
      console.log('Kullanıcı giriş yapmamış (Token yok), oyun takibi başlatılamıyor');
      return;
    }

    try {
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
        console.log(`Oyun başladı: ${gameInfo.gameName}`);
      } else {
        console.error('API Error starting session:', await response.text());
      }
    } catch (error) {
      console.error('Oturum başlatma hatası:', error);
    }
  }

  async endSession() {
    if (!this.currentSession || !this.authToken) {
      return;
    }

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime - this.currentSession.startTime) / 1000); // saniye

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
        console.log(`Oyun bitti: ${this.currentSession.gameName}, Süre: ${duration} saniye`);
      } else {
        console.error('API Error ending session:', await response.text());
      }
      
      this.currentSession = null;
    } catch (error) {
      console.error('Oturum sonlandırma hatası:', error);
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

