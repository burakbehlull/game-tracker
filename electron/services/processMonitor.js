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
      'counter-strike 2': ['cs2.exe'],
      'minecraft': ['Minecraft.exe', 'javaw.exe', 'MinecraftLauncher.exe'],
      'roblox': ['RobloxPlayerBeta.exe', 'RobloxPlayerLauncher.exe'],
      'gta v': ['GTA5.exe', 'PlayGTAV.exe'],
      'euro truck simulator 2': ['eurotrucks2.exe'],
      'fortnite': ['FortniteClient-Win64-Shipping.exe', 'FortniteLauncher.exe']
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
      // UTF-8 uyumluluğu için chcp 65001 kullan
      const command = 'chcp 65001 > nul && tasklist /FO CSV /NH';
      let stdout = '';
      
      try {
        const result = await execAsync(command, { maxBuffer: 1024 * 1024 * 4 }); // 4MB buffer
        stdout = result.stdout;
      } catch (e) {
        console.error('[ProcessMonitor] Tasklist başarısız, PowerShell deneniyor...');
        // PowerShell ile daha detaylı ve güvenli tarama
        const psCommand = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process | Select-Object ProcessName | ConvertTo-Csv -NoTypeInformation"';
        const result = await execAsync(psCommand, { maxBuffer: 1024 * 1024 * 4 });
        stdout = result.stdout;
      }
      
      const lines = stdout.split(/\r?\n/);
      const processes = new Set();
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let name = '';
        // CSV formatı veya tırnaklı çıktı: "ProcessName.exe", "PID"...
        // Veya düz metin: ProcessName.exe
        const match = trimmed.match(/^"([^"]+)"/) || trimmed.match(/^([^,]+)/);
        
        if (match) {
          name = match[1].replace(/"/g, '').trim().toLowerCase();
        }

        if (name) {
          processes.add(name);
          // .exe uzantılı ve uzantısız hallerini ekle (Windows uyumluluğu için)
          if (name.endsWith('.exe')) {
            processes.add(name.replace('.exe', ''));
          } else {
            processes.add(name + '.exe');
          }
        }
      }
      
      const processList = Array.from(processes);
      return processList;
    } catch (error) {
      console.error('[ProcessMonitor] Kritik hata:', error);
      return [];
    }
  }

  async isGameRunning(gameName) {
    const processes = await this.getRunningProcesses();
    const targetGames = this.gameProcesses[gameName.toLowerCase()];
    if (!targetGames) return false;

    return processes.some(proc => 
      targetGames.some(gameProc => {
        const lp = proc.toLowerCase();
        const lgp = gameProc.toLowerCase();
        const lgpNoExe = lgp.replace('.exe', '');
        return lp === lgp || lp === lgpNoExe || lp.includes(lgpNoExe);
      })
    );
  }

  async getRunningGameProcess() {
    try {
      const processes = await this.getRunningProcesses();
      const adminStatus = await this.isAdmin();
      
      if (!adminStatus) {
        console.warn('[ProcessMonitor] UYARI: Uygulama yönetici yetkisi olmadan çalışıyor. Bazı oyunlar (Valorant vb.) algılanamayabilir.');
      }

      for (const [gameName, gameProcs] of Object.entries(this.gameProcesses)) {
        const isRunning = processes.some(proc => 
          gameProcs.some(gameProc => {
            const lp = proc.toLowerCase();
            const lgp = gameProc.toLowerCase();
            const lgpNoExe = lgp.replace('.exe', '');
            // Tam eşleşme veya uzantısız eşleşme kontrolü
            return lp === lgp || lp === lgpNoExe || lp.includes(lgpNoExe);
          })
        );
        
        if (isRunning) {
          return {
            gameName: gameName,
            processName: gameProcs[0]
          };
        }
      }
      return null;
    } catch (error) {
      console.error('[ProcessMonitor] Oyun tarama hatası:', error);
      return null;
    }
  }

  addGame(gameName, processNames) {
    this.gameProcesses[gameName.toLowerCase()] = Array.isArray(processNames) 
      ? processNames 
      : [processNames];
  }
}

module.exports = ProcessMonitor;


