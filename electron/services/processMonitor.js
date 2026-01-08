const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execAsync = promisify(exec);

class ProcessMonitor {
  constructor() {
    this.checkInterval = 3000;
    // Normalized keys (lowercase) -> Array of exact exe names
    this.gameProcesses = {
      'valorant': ['VALORANT-Win64-Shipping.exe', 'VALORANT.exe'],
      'stardew valley': ['Stardew Valley.exe', 'StardewValley.exe'],
      'league of legends': ['LeagueClient.exe', 'League of Legends.exe', 'LeagueClientUx.exe'],
      'counter-strike 2': ['cs2.exe', 'csgo.exe'],
      'minecraft': ['Minecraft.exe', 'javaw.exe', 'MinecraftLauncher.exe'],
      'roblox': ['RobloxPlayerBeta.exe', 'RobloxPlayerLauncher.exe'],
      'gta v': ['GTA5.exe', 'PlayGTAV.exe'],
      'euro truck simulator 2': ['eurotrucks2.exe', 'amtrucks.exe'],
      'fortnite': ['FortniteClient-Win64-Shipping.exe', 'FortniteLauncher.exe'],
      'apex legends': ['r5apex.exe', 'EasyAntiCheat_launcher.exe'],
      'dota 2': ['dota2.exe'],
      'rocket league': ['RocketLeague.exe'],
      'overwatch 2': ['Overwatch.exe'],
      'the sims 4': ['TS4_x64.exe', 'TS4.exe'],
      'rust': ['RustClient.exe'],
      'genshin impact': ['GenshinImpact.exe', 'YuanShen.exe'],
      'cyberpunk 2077': ['Cyberpunk2077.exe'],
      'baldurs gate 3': ['bg3.exe', 'bg3_dx11.exe'],
      'pubg': ['TslGame.exe'],
      'call of duty': ['cod.exe', 'Call of Duty.exe'],
      'red dead redemption 2': ['RDR2.exe']
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
      console.warn('PowerShell process scan failed, falling back to legacy tasklist method:', err);
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
      console.error('Failed to parse PowerShell output:', parseErr);
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
    
    // Debug logging occasionally or if needed
    // console.log(`Scanned ${runningProcesses.size} processes`);

    for (const [gameName, exeList] of Object.entries(this.gameProcesses)) {
      for (const exe of exeList) {
        const targetExe = this.normalize(exe);
        if (runningProcesses.has(targetExe)) {
          console.log(`[ProcessMonitor] DETECTED GAME: ${gameName} (Executable: ${exe})`);
          return { gameName, processName: exe };
        }
      }
    }
    return null;
  }
}

module.exports = ProcessMonitor;
