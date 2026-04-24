const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const log = require('electron-log');
const execAsync = promisify(exec);

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'info';

class ProcessMonitor {
  constructor() {
    this.checkInterval = 3000;
    // Normalized keys (lowercase) -> Array of exact exe names
    this.gameProcesses = {};
    this.loadDefaultGames();
  }

  loadDefaultGames() {
    this.gameProcesses = {};
  }

  updateGameProcesses(dbGames) {
    if (!Array.isArray(dbGames)) return;
    
    dbGames.forEach(game => {
      if (game.name && game.processName) {
        // Split by comma to support multiple exes for one game entry
        const exes = game.processName.split(',').map(e => e.trim()).filter(Boolean);
        
        if (!this.gameProcesses[game.name]) {
          this.gameProcesses[game.name] = [];
        }
        
        exes.forEach(exe => {
          if (!this.gameProcesses[game.name].includes(exe)) {
            this.gameProcesses[game.name].push(exe);
          }
        });
      }
    });
    
    const gameList = dbGames.map(g => g.name).join(', ');
    log.info(`[ProcessMonitor] Updated game list with ${dbGames.length} games: ${gameList}`);
  }

  async isAdmin() {
    try {
      await execAsync('net session');
      return true;
    } catch {
      return false;
    }
  }

  // Helper to normalize strings for comparison
  normalize(str) {
    return str ? str.toLowerCase().trim() : '';
  }

  async getRunningProcesses() {
    try {
      // Strategy 1: PowerShell (Preferred - Structured Data)
      // log.debug('[ProcessMonitor] Scanning processes via PowerShell...');
      return await this.getProcessesFromPowershell();
    } catch (err) {
      log.warn('[ProcessMonitor] PowerShell scan failed, falling back to tasklist:', err.message);
      // Strategy 2: Tasklist (Fallback)
      return await this.getProcessesFromTasklist();
    }
  }

  async getProcessesFromPowershell() {
    // We use a more robust script that handles potential null values and errors
    const script = `
      Get-Process | ForEach-Object {
        try {
          $name = $_.Name;
          $path = $_.Path;
          [PSCustomObject]@{ Name = $name; Path = $path };
        } catch {}
      } | ConvertTo-Json -Compress
    `.replace(/\n/g, ' ').trim();

    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script}"`;

    try {
      const { stdout } = await execAsync(cmd, { maxBuffer: 20 * 1024 * 1024 });

      if (!stdout || !stdout.trim()) return new Set();

      const parsed = JSON.parse(stdout);
      const processList = Array.isArray(parsed) ? parsed : [parsed];
      const runningExes = new Set();

      processList.forEach(p => {
        if (p.Name) {
          const normalizedName = this.normalize(p.Name);
          runningExes.add(normalizedName);
          // Always add .exe version if it doesn't have it
          if (!normalizedName.endsWith('.exe')) {
            runningExes.add(normalizedName + '.exe');
          }
        }
        if (p.Path) {
          try {
            const winBasename = path.win32.basename(p.Path);
            const normalizedBasename = this.normalize(winBasename);
            runningExes.add(normalizedBasename);
            // Also add without .exe if it has it
            if (normalizedBasename.endsWith('.exe')) {
              runningExes.add(normalizedBasename.slice(0, -4));
            }
          } catch (e) {}
        }
      });

      return runningExes;
    } catch (err) {
      log.error('[ProcessMonitor] PowerShell command failed:', err.message);
      throw err;
    }
  }

  async getProcessesFromTasklist() {
    const { stdout } = await execAsync('tasklist /FO CSV /NH', { maxBuffer: 10 * 1024 * 1024 });
    const lines = stdout.split('\r\n');
    const runningExes = new Set();

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length > 0) {
        // Remove quotes and whitespace
        const exeName = parts[0].replace(/"/g, '');
        const normalized = this.normalize(exeName);
        runningExes.add(normalized);
        // Also add without .exe if it has it
        if (normalized.endsWith('.exe')) {
          runningExes.add(normalized.slice(0, -4));
        }
      }
    });

    return runningExes;
  }

  async getRunningGameProcess() {
    const runningProcesses = await this.getRunningProcesses();

    if (Object.keys(this.gameProcesses).length === 0) {
      // Periodic warning if list is empty
      if (!this.lastEmptyWarn || Date.now() - this.lastEmptyWarn > 60000) {
        log.warn('[ProcessMonitor] Tracking list is EMPTY. Check if API sync is working.');
        this.lastEmptyWarn = Date.now();
      }
      return null;
    }

    for (const [gameName, exeList] of Object.entries(this.gameProcesses)) {
      for (const exe of exeList) {
        const targetExe = this.normalize(exe);
        if (runningProcesses.has(targetExe)) {
          log.info(`[ProcessMonitor] ✅ DETECTED: ${gameName} (${exe})`);
          return { gameName, processName: exe };
        }
      }
    }

    // Optional: Log what we are looking for if nothing was found (only occasionally)
    if (!this.lastLookLog || Date.now() - this.lastLookLog > 300000) {
      log.debug(`[ProcessMonitor] Scanning for: ${Object.keys(this.gameProcesses).length} games. Sample: ${Object.keys(this.gameProcesses).slice(0, 5).join(', ')}`);
      this.lastLookLog = Date.now();
    }

    return null;
  }
}

module.exports = ProcessMonitor;
