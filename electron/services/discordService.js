const RPC = require('discord-rpc');
const log = require('electron-log');

class DiscordService {
  constructor() {
    this.client = null;
    this.clientId = process.env.DISCORD_CLIENT_ID || '';
    this.isConnected = false;
    this.reconnectTimer = null;
  }

  async connect() {
    if (!this.clientId) {
      log.warn('[DiscordService] DISCORD_CLIENT_ID is missing in .env');
      return;
    }

    if (this.isConnected) return;

    try {
      this.client = new RPC.Client({ transport: 'ipc' });

      this.client.on('ready', () => {
        log.info('[DiscordService] Connected to Discord');
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.client.on('disconnected', () => {
        log.warn('[DiscordService] Disconnected from Discord');
        this.isConnected = false;
        this.startReconnecting();
      });

      await this.client.login({ clientId: this.clientId }).catch(err => {
        log.error('[DiscordService] Login failed:', err.message);
        this.startReconnecting();
      });

    } catch (err) {
      log.error('[DiscordService] Connection error:', err);
      this.startReconnecting();
    }
  }

  startReconnecting() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      log.info('[DiscordService] Attempting to reconnect...');
      this.connect();
    }, 30000); // Try every 30 seconds
  }

  async updateActivity(gameName) {
    if (!this.isConnected || !this.client) {
      // If not connected, try connecting now
      if (!this.isConnected) this.connect();
      return;
    }

    try {
      const activity = {
        details: `Playing ${gameName.toUpperCase()}`,
        // state: 'with Game Tracker',
        // state: 'thegametracker.vercel.app',
        startTimestamp: Date.now(),
        largeImageKey: 'app_icon', // You need to upload this to Discord Developer Portal
        largeImageText: 'Game Tracker',
        instance: false,
      };

      await this.client.setActivity(activity);
      log.info(`[DiscordService] Updated activity for: ${gameName}`);
    } catch (err) {
      log.error('[DiscordService] Failed to update activity:', err);
    }
  }

  async clearActivity() {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.clearActivity();
      log.info('[DiscordService] Activity cleared');
    } catch (err) {
      log.error('[DiscordService] Failed to clear activity:', err);
    }
  }

  async destroy() {
    if (this.client) {
      this.clearActivity();
      await this.client.destroy();
      this.client = null;
      this.isConnected = false;
    }
  }
}

module.exports = DiscordService;
