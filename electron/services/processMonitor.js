const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ProcessMonitor {
  constructor() {
    this.checkInterval = 2000;
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
      'genshin impact': ['GenshinImpact.exe', 'YuanShen.exe']
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

  async getRunningProcesses() {
    try {
      const { stdout } = await execAsync(
        'tasklist /FO CSV /NH'
      );

      const processes = stdout
        .split('\r\n') // Handle Windows newlines
        .map(line => {
          // Parse CSV line: "Image Name","PID",...
          // We only want the first column "Image Name"
          const parts = line.split(',');
          if (parts.length > 0) {
            // Remove quotes and whitespace
            let validName = parts[0].replace(/"/g, '').trim().toLowerCase();
            return validName;
          }
          return null;
        })
        .filter(name => name && name.length > 0);

      // console.log(`Scanned ${processes.length} running processes.`);
      return processes;
    } catch (err) {
      console.error('Process list error:', err);
      return [];
    }
  }

  async getRunningGameProcess() {
    const processes = await this.getRunningProcesses();
    // Debug: Check if specific game files are present in the list manually
    // console.log('Checking processes...');

    for (const [gameName, exeList] of Object.entries(this.gameProcesses)) {
      for (const exe of exeList) {
        const targetExe = exe.toLowerCase();
        if (processes.includes(targetExe)) {
          console.log(`[ProcessMonitor] FOUND GAME: ${gameName} (${exe})`);
          return { gameName, processName: exe };
        }
      }
    }
    return null;
  }
}

module.exports = ProcessMonitor;
