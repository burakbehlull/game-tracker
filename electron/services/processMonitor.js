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
      'Valorant': ['VALORANT-Win64-Shipping.exe'],
      'Stardew Valley': ['Stardew Valley.exe', 'StardewValley.exe'],
      'League of Legends': ['League of Legends.exe'],
      'Counter-Strike 2': ['cs2.exe'],
      'Minecraft': ['javaw.exe'],
      'Roblox': ['RobloxPlayerBeta.exe'],
      'Gta V': ['GTA5.exe'],
      'Euro Truck Simulator 2': ['eurotrucks2.exe'],
      'Fortnite': ['FortniteClient-Win64-Shipping.exe'],
      'Apex Legends': ['r5apex.exe'],
      'Dota 2': ['dota2.exe'],
      'Rocket League': ['RocketLeague.exe'],
      'Overwatch 2': ['Overwatch.exe'],
      'The Sims 4': ['TS4_x64.exe'],
      'Rust': ['RustClient.exe'],
      'Genshin Impact': ['GenshinImpact.exe', 'YuanShen.exe'],
      'Cyberpunk 2077': ['Cyberpunk2077.exe'],
      'Baldurs Gate 3': ['bg3.exe', 'bg3_dx11.exe'],
      'Pubg': ['TslGame.exe'],
      'Call of Duty': ['cod.exe'],
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
      'Gta San Andreas': ['gta_sa.exe', 'GTASA.exe'],
      'Gta III': ['gta3.exe'],
      'Gta IV': ['GTAIV.exe'],
      'The Forest': ['TheForest.exe'],
      'Business Tour': ['BusinessTour.exe'],
      'Half Life 1': ['hl.exe'],
      'Half Life 2': ['hl2.exe'],
      'Elden Ring': ['eldenring.exe'],
      'Fivem': ['Fivem.exe'],
      'Resident Evil 1': ['ResidentEvil.exe'],
      'Resident Evil 2': ['re2.exe'],
      'Resident Evil 3': ['re3.exe'],
      'Resident Evil 4': ['re4.exe'],
      'Resident Evil Requiem': ['ResidentEvilRequiem.exe'],
      'Marvels Spider-Man 1': ['Spider-Man.exe'],
      'Marvels Spider-Man 2': ['Spider-Man2.exe'],
      'Marvels Spider-Man: Miles Morales': ['MilesMorales.exe'],
      'FC 25': ['FC25.exe'],
      'FC 24': ['FC24.exe'],
      'FC 23': ['FIFA23.exe'],
      'FC 22': ['FIFA22.exe'],
      'Sekiro': ['sekiro.exe'],
      'Assassins Creed': ['AssassinsCreed_Dx10.exe', 'AssassinsCreed_Dx9.exe'],
      'Mafia I': ['mafia.exe'],
      'Mafia II': ['mafia2.exe'],
      'Far Cry 3': ['farCry3.exe', 'farCry3_d3d11.exe'],
      'Far Cry 4': ['FarCry4.exe'],
      'Far Cry 5': ['FarCry5.exe'],
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
    // We use a more robust script that handles potential null values and errors
    const script = `
      Get-Process | ForEach-Object {
        try {
          $name = $_.Name
          $path = $_.Path
          [PSCustomObject]@{ Name = $name; Path = $path }
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
          runningExes.add(this.normalize(p.Name + '.exe'));
        }
        if (p.Path) {
          try {
            const winBasename = path.win32.basename(p.Path);
            runningExes.add(this.normalize(winBasename));
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
