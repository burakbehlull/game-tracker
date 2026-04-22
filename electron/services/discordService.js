const RPC = require('discord-rpc');
const log = require('electron-log');

class DiscordService {
  constructor() {
    this.client = null;
    this.clientId = process.env.DISCORD_CLIENT_ID || '1485085349125427231';
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.pendingActivity = null;
  }

  async connect() {
    if (this.isConnected || this.isConnecting) return;
    
    if (!this.clientId) {
      log.warn('[DiscordService] Client ID is missing');
      return;
    }

    this.isConnecting = true;
    log.info('[DiscordService] Connecting to Discord...');

    try {
      if (this.client) {
        try { await this.client.destroy(); } catch (e) {}
      }

      this.client = new RPC.Client({ transport: 'ipc' });

      this.client.on('ready', () => {
        log.info('[DiscordService] Connected and ready');
        this.isConnected = true;
        this.isConnecting = false;
        
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        if (this.pendingActivity) {
          const { gameName, startTime, isIdle } = this.pendingActivity;
          if (isIdle) {
            this.updateIdleActivity();
          } else {
            this.updateActivity(gameName, startTime);
          }
          this.pendingActivity = null;
        }
      });

      this.client.on('disconnected', () => {
        log.warn('[DiscordService] Disconnected');
        this.isConnected = false;
        this.isConnecting = false;
        this.startReconnecting();
      });

      await this.client.login({ clientId: this.clientId }).catch(err => {
        log.error('[DiscordService] Login error:', err.message);
        this.isConnecting = false;
        this.startReconnecting();
      });

    } catch (err) {
      log.error('[DiscordService] Connection fatal error:', err);
      this.isConnecting = false;
      this.startReconnecting();
    }
  }

  startReconnecting() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      log.info('[DiscordService] Retrying connection...');
      this.connect();
    }, 20000);
  }

  async updateActivity(gameName, startTime = null) {
    if (!gameName) return;
    const upperGameName = gameName.toUpperCase();
    const startTimestamp = startTime || Date.now();

    if (!this.isConnected) {
      log.info(`[DiscordService] Not connected. Queuing activity: ${upperGameName}`);
      this.pendingActivity = { gameName: upperGameName, startTime: startTimestamp, isIdle: false };
      this.connect();
      return;
    }

    try {
      const activity = {
        details: `Playing ${upperGameName}`,
        state: 'with Game Tracker',
        startTimestamp: startTimestamp,
        largeImageKey: 'app_icon',
        largeImageText: 'Game Tracker',
        instance: false,
      };

      await this.client.setActivity(activity);
      log.info(`[DiscordService] Activity set: ${upperGameName}`);
    } catch (err) {
      log.error('[DiscordService] setActivity error:', err);
    }
  }

  async updateIdleActivity() {
    // Some users prefer no status when idle
    this.clearActivity();
  }

  async clearActivity() {
    if (!this.isConnected || !this.client) {
      this.pendingActivity = { isIdle: true };
      return;
    }

    try {
      await this.client.clearActivity();
      log.info('[DiscordService] Activity cleared via clearActivity');
    } catch (err) {
      log.error('[DiscordService] clearActivity error:', err);
      try {
        // Fallback to empty activity
        await this.client.setActivity({});
        log.info('[DiscordService] Activity cleared via empty setActivity');
      } catch (e) {}
    }
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isConnected = false;
    }
  }
}

module.exports = DiscordService;
