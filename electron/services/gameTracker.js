const ProcessMonitor = require('./processMonitor');
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

class GameTracker {
  constructor() {
    this.processMonitor = new ProcessMonitor();
    this.currentSession = null;
    this.authToken = null;
    this.checkInterval = null;
    this.isTracking = false;
    this.apiUrl = process.env.VITE_API_URL || 'http://localhost:3000/api'; // Fallback if env not set
  }

  setAuthToken(token) {
    this.authToken = token;
    console.log('Auth token updated in GameTracker');
  }

  start() {
    if (this.isTracking) return;
    
    console.log(`[GameTracker] Service started. API: ${this.apiUrl}`);

    this.isTracking = true;

    // Start the tracking loop
    this.checkInterval = setInterval(async () => {
      await this.checkGameStatus();
    }, 3000);
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
      // console.warn('[GameTracker] No Auth Token available. Waiting for login...');
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
      console.error('Game tracking error:', error);
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
        // console.log('Heartbeat sent');
      }
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  }

  async startSession(game) {
    if (!this.authToken) return;

    try {
      console.log(`Starting session for: ${game.gameName}`);
      const res = await fetch(`${this.apiUrl}/games/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(game)
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }

      const data = await res.json();
      this.currentSession = {
        id: data.sessionId,
        gameName: game.gameName,
        startTime: new Date(data.startTime)
      };
      console.log(`Session started: ${data.sessionId}`);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  }

  async endSession() {
    if (!this.currentSession || !this.authToken) return;

    try {
      console.log(`Ending session for: ${this.currentSession.gameName}`);
      
      const res = await fetch(`${this.apiUrl}/games/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: this.currentSession.id })
      });

      if (!res) {
        console.error('Failed to end session: No response');
      }
      
      this.currentSession = null;
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  }
}

module.exports = GameTracker;
