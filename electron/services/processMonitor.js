const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ProcessMonitor {
  constructor() {
    this.checkInterval = 2000; // 2 saniyede bir kontrol
    this.gameProcesses = {
      'valorant': ['VALORANT-Win64-Shipping.exe'],
      "stardew valley": ["Stardew Valley.exe"],
    };
  }

  async getRunningProcesses() {
    try {
      // Windows tasklist komutunu kullan
      const { stdout } = await execAsync('tasklist /FO CSV');
      const lines = stdout.split('\n').slice(1); // İlk satırı atla (başlık)
      
      const processes = [];
      for (const line of lines) {
        if (line.trim()) {
          // CSV formatından process adını çıkar (ilk sütun, tırnak işaretleri olmadan)
          const match = line.match(/^"([^"]+)"/);
          if (match) {
            processes.push(match[1]);
          }
        }
      }
      
      return processes;
    } catch (error) {
      console.error('Process listesi alma hatası:', error);
      return [];
    }
  }

  async isGameRunning(gameName) {
    try {
      const processes = await this.getRunningProcesses();
      const gameProcesses = this.gameProcesses[gameName.toLowerCase()];
      
      if (!gameProcesses) {
        return false;
      }

      // Herhangi bir oyun process'i çalışıyor mu kontrol et
      return processes.some(proc => {
        const procName = proc.toLowerCase();
        return gameProcesses.some(gameProc => 
          procName.includes(gameProc.toLowerCase())
        );
      });
    } catch (error) {
      console.error('Process kontrol hatası:', error);
      return false;
    }
  }

  async getRunningGameProcess() {
    try {
      const processes = await this.getRunningProcesses();
      
      // Tüm tanımlı oyunları kontrol et
      for (const [gameName, gameProcesses] of Object.entries(this.gameProcesses)) {
        const isRunning = processes.some(proc => {
          const procName = proc.toLowerCase();
          return gameProcesses.some(gameProc => 
            procName.includes(gameProc.toLowerCase())
          );
        });
        
        if (isRunning) {
          return {
            gameName: gameName,
            processName: gameProcesses[0]
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

