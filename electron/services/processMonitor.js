const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ProcessMonitor {
  constructor() {
    this.checkInterval = 2000; // 2 saniyede bir kontrol
    this.gameProcesses = {
      'valorant': ['VALORANT-Win64-Shipping.exe'],
      'stardew valley': ['Stardew Valley.exe'],
      'league of legends': ['LeagueClient.exe', 'League of Legends.exe'],
      'counter-strike 2': ['cs2.exe'],
      'minecraft': ['Minecraft.exe', 'javaw.exe'],
      'roblox': ['RobloxPlayerBeta.exe'],
      'gta v': ['GTA5.exe'],
      'euro truck simulator 2': ['eurotrucks2.exe'],
      'fortnite': ['FortniteClient-Win64-Shipping.exe']
    };
  }

  async getRunningProcesses() {
    try {
      // Windows tasklist komutunu kullan, buffer boyutunu artır
      // Bazı bilgisayarlarda tasklist yavaş olabilir veya kısıtlanmış olabilir
      // Bu yüzden hem tasklist hem de powershell (alternatif olarak) denenebilir
      let stdout = '';
      try {
        const result = await execAsync('tasklist /FO CSV', { maxBuffer: 1024 * 1024 * 2 }); // 2MB buffer
        stdout = result.stdout;
      } catch (e) {
        console.error('Tasklist hatası, Powershell deneniyor...', e);
        const result = await execAsync('powershell "Get-Process | Select-Object ProcessName"', { maxBuffer: 1024 * 1024 * 2 });
        stdout = result.stdout;
      }
      
      const lines = stdout.split(/\r?\n/).slice(1);
      const processes = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          // Tasklist CSV formatı için (tırnak içindeki ilk sütun)
          const csvMatch = trimmedLine.match(/^"([^"]+)"/);
          if (csvMatch) {
            processes.push(csvMatch[1].toLowerCase());
          } else {
            // Powershell veya diğer düz metin formatları için
            processes.push(trimmedLine.toLowerCase());
          }
        }
      }
      
      return [...new Set(processes)]; // Tekrar edenleri temizle
    } catch (error) {
      console.error('Process listesi alma hatası:', error);
      return [];
    }
  }

  async isGameRunning(gameName) {
    try {
      const processes = await this.getRunningProcesses();
      const targetGames = this.gameProcesses[gameName.toLowerCase()];
      
      if (!targetGames) return false;

      return processes.some(proc => 
        targetGames.some(gameProc => 
          proc.includes(gameProc.toLowerCase()) || 
          gameProc.toLowerCase().includes(proc)
        )
      );
    } catch (error) {
      console.error('Process kontrol hatası:', error);
      return false;
    }
  }

  async getRunningGameProcess() {
    try {
      const processes = await this.getRunningProcesses();
      
      for (const [gameName, gameProcs] of Object.entries(this.gameProcesses)) {
        const isRunning = processes.some(proc => 
          gameProcs.some(gameProc => {
            const lowProc = proc.toLowerCase();
            const lowGameProc = gameProc.toLowerCase();
            return lowProc.includes(lowGameProc) || lowGameProc.includes(lowProc);
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
      console.error('Oyun process kontrol hatası:', error);
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

