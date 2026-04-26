const ProcessMonitor = require('./processMonitor');
const { exec } = require('child_process');
const { Notification } = require('electron');
const path = require('path');
const log = require('electron-log');
const dotenv = require('dotenv');

// Always try to load .env (no-op if not found in production)
try {
  const envPath = path.join(__dirname, '../../.env');
  dotenv.config({ path: envPath });
} catch (_) {}

// The remote API URL where the game list (processNames) is stored.
// VITE_API_URL is a frontend Vite variable and is NOT injected into the
// Electron main process in a packaged (production) build.
// We therefore hardcode the remote URL here as the authoritative source
// for game data, and fall back to the embedded local server only when
// running in development (where the remote may be unreachable).
const REMOTE_GAMES_API_URL = 'https://game-tracker-4axf.onrender.com/api';

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
    this.healthNotificationsEnabled = true; // Default to true
    this.disabledTrackingGames = []; // New field
    // Remote API URL – used for session start/end/heartbeat calls.
    // In production, VITE_API_URL is not available to the main process,
    // so we fall back to the authoritative remote URL to ensure data is saved
    // to the real database, not the local embedded one.
    this.apiUrl = process.env.VITE_API_URL || REMOTE_GAMES_API_URL;

    // Remote API URL – used for syncing the game list (processNames).
    this.gamesApiUrl = REMOTE_GAMES_API_URL;

    log.info(`[GameTracker] Initialized. apiUrl: ${this.apiUrl} | gamesApiUrl: ${this.gamesApiUrl}`);
  }

  setHealthNotifications(enabled) {
    this.healthNotificationsEnabled = enabled;
    log.info(`[GameTracker] Health Notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  setDisabledTrackingGames(games) {
    this.disabledTrackingGames = Array.isArray(games) ? games : [];
    log.info(`[GameTracker] Disabled tracking games: ${this.disabledTrackingGames.join(', ')}`);
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

    // Sync games from DB on start
    this.syncGamesFromDB();

    // Start the tracking loop
    this.checkInterval = setInterval(async () => {
      await this.checkGameStatus();
    }, 2000); // Check every 2 seconds

    // Periodically re-sync games from DB (every 5 minutes)
    this.syncInterval = setInterval(async () => {
      await this.syncGamesFromDB();
    }, 5 * 60 * 1000);
  }

  async syncGamesFromDB() {
    // Try remote API first (authoritative source for game list).
    // Fall back to local embedded server if remote is unreachable.
    const urlsToTry = [this.gamesApiUrl, this.apiUrl].filter(
      (u, i, arr) => arr.indexOf(u) === i  // deduplicate
    );

    for (const baseUrl of urlsToTry) {
      try {
        log.info(`[GameTracker] Syncing games from: ${baseUrl}/games`);
        const res = await fetch(`${baseUrl}/games`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const games = await res.json();
          this.processMonitor.updateGameProcesses(games);
          log.info(`[GameTracker] Synced ${games.length} games from ${baseUrl}`);
          if (games.length === 0) {
            log.warn('[GameTracker] Remote returned 0 games – check the database.');
          }
          return; // success – stop trying
        } else {
          log.warn(`[GameTracker] ${baseUrl}/games returned ${res.status} ${res.statusText}`);
        }
      } catch (err) {
        log.warn(`[GameTracker] Could not reach ${baseUrl}/games: ${err.message}`);
      }
    }

    log.error('[GameTracker] All game-sync attempts failed. Tracking will not work until next retry.');
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
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isTracking = false;
    
    if (this.discordService) {
      await this.discordService.destroy();
    }

    // Attempt to close any open session explicitly
    return this.endSession(); 
  }

  async checkGameStatus() {
    try {
      const runningGame = await this.processMonitor.getRunningGameProcess();
      
      // Handle Game Session Logic
      if (this.currentSession) {
        // Oyun hala çalışıyor mu kontrol et
        if (!runningGame || runningGame.gameName !== this.currentSession.gameName) {
          log.info(`[GameTracker] Game stopped or changed: ${this.currentSession.gameName} -> ${runningGame?.gameName || 'None'}`);
          await this.endSession();
          
          // Yeni oyun başladıysa ve tracking disabled değilse başlat
          if (runningGame && !this.disabledTrackingGames.includes(runningGame.gameName)) {
            await this.startSession(runningGame);
          }
        } else {
          // Oyun hala çalışıyor - heartbeat ve limit kontrolü
          this.checkSessionLimits();
          if (this.authToken) {
            await this.sendHeartbeat();
          }
        }
      } else {
        // Hiç session yok, yeni oyun başladı mı?
        if (runningGame && !this.disabledTrackingGames.includes(runningGame.gameName)) {
          await this.startSession(runningGame);
        }
      }
    } catch (error) {
      log.error('[GameTracker] Game tracking error:', error);
    }
  }

  getCurrentSession() {
    return this.currentSession;
  }

  async sendHeartbeat() {
    // Heartbeat her 10 saniyede bir gönderilir (daha sık güncelleme)
    const now = Date.now();
    if (this.lastHeartbeat && (now - this.lastHeartbeat < 10000)) {
      return;
    }

    if (!this.currentSession || !this.authToken) {
      log.warn('[GameTracker] Heartbeat skipped: no session or no token');
      return;
    }

    // Session ID kontrolü - local session'ları atla
    if (this.currentSession.id.startsWith('local-')) {
      log.warn('[GameTracker] Heartbeat skipped: local session (not synced to backend yet)');
      return;
    }

    // Check health notifications
    this.checkHealthNotifications();

    try {
      log.info(`[GameTracker] Sending heartbeat for session: ${this.currentSession.id}`);
      
      const res = await fetch(`${this.apiUrl}/games/${this.currentSession.id}/heartbeat`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        timeout: 5000
      });
      
      if (res.ok) {
        const data = await res.json();
        this.lastHeartbeat = now;
        log.info(`[GameTracker] ✅ Heartbeat successful. Duration: ${data.duration}s`);
      } else {
        const text = await res.text();
        log.error(`[GameTracker] ❌ Heartbeat failed: ${res.status} ${res.statusText} - ${text}`);
      }
    } catch (err) {
      log.error('[GameTracker] ❌ Heartbeat error:', err.message);
    }
  }

  async syncPresence(isPlaying, currentGame = null) {
    if (!this.authToken) return;
    try {
      await fetch(`${this.apiUrl}/presence/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPlaying, currentGame })
      });
    } catch (err) {
      log.warn('[GameTracker] Presence sync failed:', err.message);
    }
  }

  async startSession(game) {
    if (this.currentSession) {
      log.warn('[GameTracker] Session already exists, skipping');
      return;
    }

    try {
      log.info(`[GameTracker] ========================================`);
      log.info(`[GameTracker] Starting NEW session for: ${game.gameName}`);
      log.info(`[GameTracker] Process: ${game.processName}`);
      log.info(`[GameTracker] Auth Token: ${this.authToken ? 'YES' : 'NO'}`);
      log.info(`[GameTracker] ========================================`);
      
      // 1. Set local state immediately for instant feedback
      let sessionId = 'local-' + Date.now();
      let startTime = new Date();

      this.currentSession = {
        id: sessionId,
        gameName: game.gameName,
        processName: game.processName, 
        startTime: startTime
      };
      
      // 2. Update Discord RPC immediately
      if (this.discordService && this.discordRPCEnabled) {
        this.discordService.updateActivity(game.gameName, this.currentSession.startTime.getTime());
      }

      // 3. Notify main process to update tray
      this.notifyMainProcess('game-started', { gameName: game.gameName });

      // 4. CRITICAL: Perform backend sync (if token available)
      if (this.authToken) {
        try {
          log.info(`[GameTracker] Syncing session to backend: ${this.apiUrl}/games/start`);
          
          const res = await fetch(`${this.apiUrl}/games/start`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              gameName: game.gameName,
              processName: game.processName
            }),
            timeout: 10000
          });

          if (res.ok) {
            const data = await res.json();
            this.currentSession.id = data.sessionId;
            this.currentSession.startTime = new Date(data.startTime);
            log.info(`[GameTracker] ✅ Remote session established!`);
            log.info(`[GameTracker] Session ID: ${this.currentSession.id}`);
            log.info(`[GameTracker] Start Time: ${this.currentSession.startTime}`);
          } else {
            const text = await res.text();
            log.error(`[GameTracker] ❌ Remote session failed: ${res.status} ${res.statusText}`);
            log.error(`[GameTracker] Response: ${text}`);
            log.error(`[GameTracker] WARNING: Session will NOT be saved to database!`);
          }
          
          await this.syncPresence(true, game.gameName);
        } catch (syncErr) {
          log.error(`[GameTracker] ❌ Backend sync FAILED:`, syncErr.message);
          log.error(`[GameTracker] WARNING: Session will NOT be saved to database!`);
        }
      } else {
        log.error(`[GameTracker] ❌ NO AUTH TOKEN - Session will NOT be saved!`);
        log.error(`[GameTracker] Please login to save game sessions.`);
      }
    } catch (err) {
      log.error('[GameTracker] Fatal error in startSession:', err);
    }
  }

  notifyMainProcess(event, data) {
    try {
      // Send event to main process via IPC if available
      if (process && process.send) {
        process.send({ type: event, data });
      }
    } catch (err) {
      // Silently fail if IPC not available
    }
  }

  async endSession() {
    if (!this.currentSession) {
      log.warn('[GameTracker] No session to end');
      return;
    }

    try {
      const gameName = this.currentSession.gameName;
      const sessionId = this.currentSession.id;
      const isLocalSession = sessionId.startsWith('local-');
      
      log.info(`[GameTracker] ========================================`);
      log.info(`[GameTracker] Ending session for: ${gameName}`);
      log.info(`[GameTracker] Session ID: ${sessionId}`);
      log.info(`[GameTracker] Is Local: ${isLocalSession}`);
      log.info(`[GameTracker] Auth Token: ${this.authToken ? 'YES' : 'NO'}`);
      log.info(`[GameTracker] ========================================`);
      
      // 1. Clear Discord RPC immediately when game closes
      if (this.discordService) {
        await this.discordService.clearActivity();
        log.info(`[GameTracker] Discord RPC cleared`);
      }
      
      // 2. Notify main process to update tray
      this.notifyMainProcess('game-stopped', { gameName });
      
      // 3. CRITICAL: End backend session (if not local)
      if (this.authToken && !isLocalSession) {
        try {
          log.info(`[GameTracker] Ending remote session: ${this.apiUrl}/games/end`);
          
          const res = await fetch(`${this.apiUrl}/games/end`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId: sessionId }),
            timeout: 10000
          });
          
          if (res.ok) {
            const data = await res.json();
            log.info(`[GameTracker] ✅ Session ended successfully!`);
            log.info(`[GameTracker] Duration: ${data.duration}s (${Math.floor(data.duration / 60)} minutes)`);
          } else {
            const text = await res.text();
            log.error(`[GameTracker] ❌ Failed to end session: ${res.status} ${res.statusText}`);
            log.error(`[GameTracker] Response: ${text}`);
          }
        } catch (err) {
          log.error(`[GameTracker] ❌ Failed to end remote session:`, err.message);
        }
      } else if (isLocalSession) {
        log.error(`[GameTracker] ❌ Session was LOCAL - NOT saved to database!`);
        log.error(`[GameTracker] This means the session start failed or no auth token.`);
      }
      
      // 4. Update presence to idle
      if (this.authToken) {
        await this.syncPresence(false, null);
      }

      // 5. Clear current session
      this.currentSession = null;
      log.info(`[GameTracker] Session cleared from memory`);
    } catch (err) {
      log.error('[GameTracker] Error ending session:', err);
      this.currentSession = null;
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
      new Notification({ 
        title, 
        body,
        icon: path.join(__dirname, '../../public/icon.png')
      }).show();
    }
  }

  async checkHealthNotifications() {
    if (!this.healthNotificationsEnabled || !this.currentSession) return;

    const now = new Date();
    const elapsedMs = now.getTime() - this.currentSession.startTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    // 1. "2 saattir ara vermedin" (120 minutes)
    if (elapsedMinutes >= 120 && !this.currentSession.healthWarned2h) {
      this.sendWarning('Sağlık Sistemi', '2 saattir ara vermedin');
      this.currentSession.healthWarned2h = true;
    }

    // 2. "Bugün 6 saat oynadın, mola önerilir" (360 minutes)
    if (!this.currentSession.healthWarned6hTotal) {
      try {
        const res = await fetch(`${this.apiUrl}/games/today`, {
          headers: { 'Authorization': `Bearer ${this.authToken}` }
        });
        if (res.ok) {
          const { totalTime } = await res.json(); // totalTime is in seconds
          const totalMinutes = Math.floor(totalTime / 60);
          if (totalMinutes >= 360) {
            this.sendWarning('Sağlık Sistemi', 'Bugün 6 saat oynadın, mola önerilir');
            this.currentSession.healthWarned6hTotal = true;
          }
        }
      } catch (err) {
        log.error('Failed to check today total playtime:', err);
      }
    }

    // 3. "Gece 03:00 – uyku zamanı"
    const currentHour = now.getHours();
    if (currentHour === 3 && !this.currentSession.healthWarnedSleep) {
      this.sendWarning('Sağlık Sistemi', 'Gece 03:00 – uyku zamanı');
      this.currentSession.healthWarnedSleep = true;
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

    // Basic sanitization: only allow alphanumeric, dots, hyphens and underscores
    if (!/^[a-zA-Z0-9.\-_ ]+$/.test(processName)) {
      log.error(`[GameTracker] Malicious process name detected: ${processName}`);
      return;
    }

    exec(`taskkill /F /IM "${processName}"`, (err) => {
      if (err) {
        log.error(`[GameTracker] Failed to kill process ${processName}:`, err);
      } else {
        this.sendWarning('Süre Doldu', `${gameName} tanımlanan süre dolduğu için kapatıldı.`);
      }
    });

    await this.endSession();
  }
}

module.exports = GameTracker;
