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
    this.gameProcesses = {
      'Valorant': ['VALORANT-Win64-Shipping.exe', 'VALORANT.exe'],
      'Stardew Valley': ['Stardew Valley.exe', 'StardewValley.exe'],
      'League of Legends': ['LeagueClient.exe', 'League of Legends.exe', 'LeagueClientUx.exe'],
      'Counter-Strike 2': ['cs2.exe', 'csgo.exe'],
      'Minecraft': ['Minecraft.exe', 'javaw.exe', 'MinecraftLauncher.exe'],
      'Roblox': ['RobloxPlayerBeta.exe', 'RobloxPlayerLauncher.exe'],
      'Gta V': ['GTA5.exe', 'PlayGTAV.exe'],
      'Euro Truck Simulator 2': ['eurotrucks2.exe', 'amtrucks.exe'],
      'Fortnite': ['FortniteClient-Win64-Shipping.exe', 'FortniteLauncher.exe'],
      'Apex Legends': ['r5apex.exe', 'EasyAntiCheat_launcher.exe'],
      'Dota 2': ['dota2.exe'],
      'Rocket League': ['RocketLeague.exe'],
      'Overwatch 2': ['Overwatch.exe'],
      'The Sims 4': ['TS4_x64.exe', 'TS4.exe'],
      'Rust': ['RustClient.exe'],
      'Genshin Impact': ['GenshinImpact.exe', 'YuanShen.exe'],
      'Cyberpunk 2077': ['Cyberpunk2077.exe'],
      'Baldurs Gate 3': ['bg3.exe', 'bg3_dx11.exe'],
      'Pubg': ['TslGame.exe'],
      'Call of Duty': ['cod.exe', 'Call of Duty.exe'],
      'Red Dead Redemption 2': ['RDR2.exe'],
      'Red Dead Redemption 1': ['RDR.exe', 'RDR1.exe'],
      'Dark Souls I': ['DarkSouls.exe', 'DarkSoulsRemastered.exe'],
      'Dark Souls II': ['DarkSoulsII.exe'],
      'Dark Souls III': ['DarkSoulsIII.exe'],
      'Alan Wake': ['AlanWake.exe', 'AlanWake2.exe', 'AlanWake-Win64-Shipping.exe'],
      'Outlast': ['Outlast.exe'],
      'Outlast 2': ['Outlast2.exe'],
      'Papers Please': ['PapersPlease.exe'],
      'Left 4 Dead 1': ['left4dead.exe'],
      'Left 4 Dead 2': ['left4dead2.exe'],
      'Gta Vice City': ['gta-vc.exe', 'GTAVC.exe'],
      'Gta San Andreas': ['gta_sa.exe', 'GTASA.exe', 'gta-sa.exe'],
      'Gta III': ['gta3.exe'],
      'Gta IV': ['GTAIV.exe', 'PlayGTAIV.exe'],
      'The Forest': ['TheForest.exe'],
      'Business Tour': ['BusinessTour.exe'],
      'Half Life 1': ['hl.exe'],
      'Half Life 2': ['hl2.exe'],
      'Elden Ring': ['eldenring.exe'],
      'Fivem': ['Fivem.exe']
    };
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
      return await this.getProcessesFromPowershell();
    } catch (err) {
      log.warn('PowerShell process scan failed, falling back to legacy tasklist method:', err);
      // Strategy 2: Tasklist (Fallback)
      return await this.getProcessesFromTasklist();
    }
  }

  async getProcessesFromPowershell() {
    // CMD: Get processes, select Name and Path, output as JSON.
    // We use -Compress to minimize size, and -Depth 1.
    const cmd = `powershell -NoProfile -Command "Get-Process | Select-Object Name, Path | ConvertTo-Json -Depth 1 -Compress"`;

    // Increase maxBuffer to 10MB to handle many processes
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

    if (!stdout || !stdout.trim()) return new Set();

    let processList = [];
    try {
      // Powershell might return a single object or an array
      const parsed = JSON.parse(stdout);
      processList = Array.isArray(parsed) ? parsed : [parsed];
    } catch (parseErr) {
      log.error('Failed to parse PowerShell output:', parseErr);
      throw parseErr;
    }

    const runningExes = new Set();

    processList.forEach(p => {
      // 1. Add Process Name + .exe (e.g. "notepad" -> "notepad.exe")
      if (p.Name) {
        runningExes.add(this.normalize(p.Name + '.exe'));
      }

      // 2. Add full binary name from Path if available
      if (p.Path) {
        const winBasename = path.win32.basename(p.Path);
        runningExes.add(this.normalize(winBasename));
      }
    });

    return runningExes;
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
        runningExes.add(this.normalize(exeName));
      }
    });

    return runningExes;
  }

  async getRunningGameProcess() {
    const runningProcesses = await this.getRunningProcesses();

    // log.info(`Scanned ${runningProcesses.size} processes`);

    for (const [gameName, exeList] of Object.entries(this.gameProcesses)) {
      for (const exe of exeList) {
        const targetExe = this.normalize(exe);
        if (runningProcesses.has(targetExe)) {
          log.info(`[ProcessMonitor] DETECTED GAME: ${gameName} (Executable: ${exe})`);
          return { gameName, processName: exe };
        }
      }
    }
    return null;
  }
}

module.exports = ProcessMonitor;
