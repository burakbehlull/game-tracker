const ProcessMonitor = require('./processMonitor');
const { exec } = require('child_process');
const { Notification } = require('electron');
const path = require('path');
const log = require('electron-log');
// Use a more robust way to load env or defaults
// In production (asar), .env might not exist.
const dotenv = require('dotenv');

// Attempt to load .env only if likely in dev environment
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '../../.env');
  dotenv.config({ path: envPath });
}

const DiscordService = require('./discordService');

class GameTracker {
  constructor() {
    this.processMonitor = new ProcessMonitor();
    this.discordService = new DiscordService();
    this.currentSession = null;
    this.authToken = null;
    this.checkInterval = null;
    this.isTracking = false;
    this.discordRPCEnabled = true; // Default to true as requested
    // Hardcoded fallback because internal server listens on 3000
    this.apiUrl = process.env.VITE_API_URL || 'http://localhost:3000/api'; 
    
    log.info(`[GameTracker] Initialized. API URL: ${this.apiUrl}`);
  }

  setAuthToken(token) {
    this.authToken = token;
    log.info('Auth token updated in GameTracker');
  }

  setDiscordRPC(enabled) {
    this.discordRPCEnabled = enabled;
    log.info(`[GameTracker] Discord RPC ${enabled ? 'enabled' : 'disabled'}`);
    
    if (this.discordService) {
      if (enabled) {
        this.discordService.connect().then(() => {
          if (this.currentSession) {
             this.discordService.updateActivity(this.currentSession.gameName);
          }
        });
      } else {
        this.discordService.clearActivity();
      }
    }
  }

  start() {
    if (this.isTracking) return;
    
    log.info(`[GameTracker] Service started.`);

    this.isTracking = true;

    // Start the tracking loop
    this.checkInterval = setInterval(async () => {
      await this.checkGameStatus();
    }, 3000); // Check every 3 seconds
  }

  async setSessionLimit(minutes) {
    if (this.currentSession) {
      this.currentSession.limitMinutes = minutes;
      log.info(`[GameTracker] Limit set for current session: ${minutes} minutes`);
    }
  }

  async stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isTracking = false;
    
    if (this.discordService) {
      await this.discordService.destroy();
    }

    // Attempt to close any open session explicitly
    return this.endSession(); 
  }

  async checkGameStatus() {
    if (!this.authToken) {
      // log.warn('[GameTracker] No Auth Token available. Waiting for login...');
      return;
    }

    try {
      const runningGame = await this.processMonitor.getRunningGameProcess();

      if (this.currentSession) {
        // We have an active session
        if (!runningGame || runningGame.gameName !== this.currentSession.gameName) {
          // Game stopped or changed
          await this.endSession();

          // If changed directly to another game
          if (runningGame) {
            await this.startSession(runningGame);
          }
        } else {
          // Game is still running, send heartbeat
          this.checkSessionLimits();
          await this.sendHeartbeat();
        }
      } else {
        // No active session
        if (runningGame) {
          await this.startSession(runningGame);
        }
      }
    } catch (error) {
      log.error('Game tracking error:', error);
    }
  }

  getCurrentSession() {
    return this.currentSession;
  }

  async sendHeartbeat() {
    // throttle heartbeat to every 1 minute
    const now = Date.now();
    if (this.lastHeartbeat && (now - this.lastHeartbeat < 60000)) {
      return;
    }

    if (!this.currentSession || !this.authToken) return;

    try {
      const res = await fetch(`${this.apiUrl}/games/${this.currentSession.id}/heartbeat`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (res.ok) {
        this.lastHeartbeat = now;
        // log.info('Heartbeat sent');
      } else {
        log.warn(`Heartbeat failed: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      log.error('Heartbeat failed:', err);
    }
  }

  async startSession(game) {
    if (!this.authToken) return;

    try {
      log.info(`Starting session for: ${game.gameName}`);
      const res = await fetch(`${this.apiUrl}/games/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(game)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${res.statusText} ${text}`);
      }

      const data = await res.json();
      this.currentSession = {
        id: data.sessionId,
        gameName: game.gameName,
        processName: game.processName, // Crucial for taskkill
        startTime: new Date(data.startTime)
      };
      
      if (this.discordService && this.discordRPCEnabled) {
        this.discordService.updateActivity(game.gameName);
      }

      log.info(`[GameTracker] Session started: ${data.sessionId} (Process: ${game.processName})`);
    } catch (err) {
      log.error('Failed to start session:', err);
    }
  }

  async endSession() {
    if (!this.currentSession || !this.authToken) return;

    try {
      log.info(`Ending session for: ${this.currentSession.gameName}`);
      
      const res = await fetch(`${this.apiUrl}/games/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: this.currentSession.id })
      });

      if (!res) {
        log.error('Failed to end session: No response');
      }
      if (this.discordService) {
        this.discordService.clearActivity();
      }

      this.currentSession = null;
    } catch (err) {
      log.error('Failed to end session:', err);
    }
  }

  checkSessionLimits() {
    if (!this.currentSession || !this.currentSession.limitMinutes) return;

    const elapsedMs = Date.now() - this.currentSession.startTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const remainingMinutes = this.currentSession.limitMinutes - elapsedMinutes;

    log.debug(`[GameTracker Timer] Elapsed: ${elapsedMinutes}m, Limit: ${this.currentSession.limitMinutes}m, Remaining: ${remainingMinutes}m`);

    // 10 dakika uyarısı
    if (remainingMinutes === 10 && !this.currentSession.warned10) {
      this.sendWarning('10 Dakika Kaldı', 'Oyunun kapanmasına 10 dakika kaldı. Kaydetmeyi unutma!');
      this.currentSession.warned10 = true;
    }

    // 2 dakika uyarısı
    if (remainingMinutes === 2 && !this.currentSession.warned2) {
      this.sendWarning('Son 2 Dakika!', 'Süre dolmak üzere, oyun otomatik olarak kapatılacak!');
      this.currentSession.warned2 = true;
    }

    // Kapatma
    if (remainingMinutes <= 0) {
      this.forceQuitGame();
    }
  }

  sendWarning(title, body) {
    log.info(`[GameTracker Notification] ${title}: ${body}`);
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }

  async forceQuitGame() {
    if (!this.currentSession) return;
    const { processName, gameName } = this.currentSession;
    
    if (!processName) {
      log.error(`[GameTracker] cannot terminate ${gameName}: processName is missing!`);
      return;
    }

    log.info(`[GameTracker] LIMIT REACHED for ${gameName} (${processName}). Terminating...`);

    exec(`taskkill /F /IM "${processName}"`, (err) => {
      if (err) {
        log.error(`Failed to kill process ${processName}:`, err);
      } else {
        this.sendWarning('Süre Doldu', `${gameName} tanımlanan süre dolduğu için kapatıldı.`);
      }
    });

    await this.endSession();
  }
}

module.exports = GameTracker;
