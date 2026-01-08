import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Gamepad2, Clock, Calendar, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ user }) {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [isAdmin, setIsAdmin] = useState(true);
  const [loading, setLoading] = useState(true);

  // Initial Data Load
  useEffect(() => {
    loadData();
    checkAdmin();

    // Refresh stats less frequently (every 60s) to save resources
    const statsInterval = setInterval(loadData, 60000);
    return () => clearInterval(statsInterval);
  }, []);

  // Poll for Current Game Status (every 3s)
  useEffect(() => {
    const checkGame = async () => {
      if (window.electronAPI) {
        try {
          const game = await window.electronAPI.getCurrentGame();
          setCurrentGame(game);
        } catch (error) {
          console.error('Game check error:', error);
        }
      }
    };

    checkGame(); // immediate
    const gameInterval = setInterval(checkGame, 3000);
    return () => clearInterval(gameInterval);
  }, []);

  // Live Timer Effect (runs every 1s only when a game is active)
  useEffect(() => {
    let timer;
    if (currentGame?.startTime) {
      const start = new Date(currentGame.startTime).getTime();
      
      // Update immediately
      setLiveDuration(Math.floor((Date.now() - start) / 1000));

      timer = setInterval(() => {
        const now = Date.now();
        const seconds = Math.floor((now - start) / 1000);
        setLiveDuration(seconds);
      }, 1000);
    } else {
      setLiveDuration(0);
    }

    return () => clearInterval(timer);
  }, [currentGame?.startTime]); // Only restart if game triggers a new start time

  const checkAdmin = async () => {
    if (window.electronAPI) {
      const adminStatus = await window.electronAPI.checkAdminStatus();
      setIsAdmin(adminStatus);
    }
  };

  const loadData = async () => {
    try {
      const [sessionsData, statsData] = await Promise.all([
        api.getSessions(),
        api.getStats()
      ]);
      setSessions(sessionsData);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0 sn';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (h > 0) parts.push(`${h} sa`);
    if (m > 0) parts.push(`${m} dk`);
    if (s > 0 || parts.length === 0) parts.push(`${s} sn`); // Always show seconds

    return parts.join(' ');
  };

  const formatStartTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 animate-pulse">Veriler yükleniyor...</div>;
  }

  return (
    <div className="relative min-h-screen pb-12">
      {/* Optimized Background: CSS gradient is cheaper than heavy blurry divs */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

      <div className="container max-w-6xl mx-auto pt-10 px-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Hoş Geldiniz, <span className="text-primary">{user?.username}</span>
            </h1>
            <p className="text-gray-400 mt-1">
              Oyun aktiviteleriniz takip ediliyor.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             Sistem Aktif
          </div>
        </div>

        {/* Admin Warning */}
        {!isAdmin && (
          <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center gap-3">
            <Gamepad2 className="w-4 h-4" />
            <span className="text-sm font-medium">Tam verim için yönetici olarak çalıştırın.</span>
          </div>
        )}

        {/* Live Game Card - Optimized */}
        {currentGame ? (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-blue-500/30 bg-[#0B1120] shadow-lg shadow-blue-900/10">
            {/* Background Image/Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-30"></div>
            
            <div className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-blue-400/80 tracking-widest uppercase">ŞU ANDA OYNANIYOR</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  CANLI
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-center">
                 <div className="flex-1 text-center md:text-left">
                    <div className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight uppercase truncate max-w-full">
                      {currentGame.gameName}
                    </div>
                    <div className="text-lg text-blue-300/60 font-medium">İyi oyunlar!</div>
                 </div>
                 
                 <div className="flex gap-4">
                    <div className="px-6 py-4 rounded-xl bg-black/40 border border-white/5 min-w-[120px] text-center">
                       <div className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Süre</div>
                       <div className="text-2xl font-black text-white">{formatDuration(liveDuration)}</div>
                    </div>
                    <div className="px-6 py-4 rounded-xl bg-black/40 border border-white/5 min-w-[120px] text-center">
                       <div className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Başlangıç</div>
                       <div className="text-2xl font-black text-white">{formatStartTime(currentGame.startTime)}</div>
                    </div>
                 </div>
              </div>
            </div>
            {/* Progress Bar Animation */}
            <div className="h-1 w-full bg-blue-900/30">
               <div className="h-full bg-blue-500/80 w-full animate-[progress_2s_ease-in-out_infinite origin-left scale-x-0]"></div>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-8 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-400">Şu An Oyun Oynanmıyor</h3>
            <p className="text-gray-600 text-sm mt-1">Bir oyun başlattığınızda takibi otomatik başlayacaktır.</p>
          </div>
        )}

        {/* Stats & History Tabs */}
        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="bg-black/20 p-1 rounded-full border border-white/5">
            <TabsTrigger value="stats" className="rounded-full px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">İstatistikler</TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-full px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Geçmiş</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="animate-in fade-in duration-300">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-2xl border border-white/5 bg-[#0d1117] p-6 hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                     <h3 className="text-xl font-bold text-white capitalize truncate pr-4">{stat._id}</h3>
                     <TrendingUp className="w-5 h-5 text-gray-600" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Toplam</div>
                      <div className="text-3xl font-black text-white">{formatDuration(stat.totalTime)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div>
                         <div className="text-[10px] font-bold text-gray-500 uppercase">Oturum</div>
                         <div className="font-bold text-gray-300">{stat.sessionCount}</div>
                      </div>
                      {stat.lastPlayed && (
                        <div className="text-right">
                           <div className="text-[10px] font-bold text-gray-500 uppercase">Son</div>
                           <div className="font-bold text-gray-300">{new Date(stat.lastPlayed).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {stats.length === 0 && (
                 <div className="col-span-full py-12 text-center text-gray-500">Veri yok.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="animate-in fade-in duration-300">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session._id} className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-[#0d1117]/50 hover:bg-[#0d1117] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{session.gameName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(session.startTime).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">{formatDuration(session.duration)}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

