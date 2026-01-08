const ProcessMonitor = require('./processMonitor');
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

class GameTracker {
  constructor() {
    this.processMonitor = new ProcessMonitor();
    this.currentSession = null;
    this.authToken = null;
    this.checkInterval = null;
    this.isTracking = false;
    // Hardcoded fallback because internal server listens on 3000
    this.apiUrl = process.env.VITE_API_URL || 'http://localhost:3000/api'; 
    
    log.info(`[GameTracker] Initialized. API URL: ${this.apiUrl}`);
  }

  setAuthToken(token) {
    this.authToken = token;
    log.info('Auth token updated in GameTracker');
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

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isTracking = false;
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
        startTime: new Date(data.startTime)
      };
      log.info(`Session started: ${data.sessionId}`);
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
      
      this.currentSession = null;
    } catch (err) {
      log.error('Failed to end session:', err);
    }
  }
}

module.exports = GameTracker;
