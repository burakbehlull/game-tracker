const ProcessMonitor = require('./processMonitor');
const GameSession = require('../models/GameSession');

class GameTracker {
  constructor() {
    this.processMonitor = new ProcessMonitor();
    this.currentSession = null;
    this.checkInterval = null;
    this.lastGameState = false;
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
    
    if (this.currentSession) {
      this.endSession();
    }
    
    console.log('Oyun takip servisi durduruldu');
  }

  async checkGameStatus() {
    const runningGame = await this.processMonitor.getRunningGameProcess();
    const isGameRunning = runningGame !== null;

    if (isGameRunning !== this.lastGameState) {
      if (isGameRunning && !this.currentSession) {
        await this.startSession(runningGame);
      } else if (!isGameRunning && this.currentSession) {
        await this.endSession();
      }
      this.lastGameState = isGameRunning;
    }
  }

  async startSession(gameInfo) {
    try {
      const session = new GameSession({
        gameName: gameInfo.gameName,
        processName: gameInfo.processName,
        startTime: new Date()
      });

      await session.save();
      this.currentSession = session;
      console.log(`Oyun başladı: ${gameInfo.gameName}`);
    } catch (error) {
      console.error('Oturum başlatma hatası:', error);
    }
  }

  async endSession() {
    if (!this.currentSession) {
      return;
    }

    try {
      const endTime = new Date();
      const duration = Math.floor((endTime - this.currentSession.startTime) / 1000); // saniye

      this.currentSession.endTime = endTime;
      this.currentSession.duration = duration;
      await this.currentSession.save();

      console.log(`Oyun bitti: ${this.currentSession.gameName}, Süre: ${duration} saniye`);
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

