import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Gamepad2, Clock, Calendar, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ user }) {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
      updateCurrentGame();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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

  const updateCurrentGame = async () => {
    try {
      if (window.electronAPI) {
        const game = await window.electronAPI.getCurrentGame();
        setCurrentGame(game);
      }
    } catch (error) {
      console.error('Mevcut oyun bilgisi hatası:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 dk';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} sa ${minutes} dk`;
    } else if (minutes > 0) {
      return `${minutes} dk`;
    } else {
      return `${seconds} sn`;
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('tr-TR');
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="relative min-h-screen pb-12">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />

      <div className="container max-w-6xl mx-auto pt-16 px-4 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Hoş Geldiniz, {user?.username}!
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Oyun istatistikleriniz ve canlı oturumlarınız burada.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-sm font-medium">Sistem Çevrimiçi</span>
          </div>
        </div>

        {/* Live Game Card - Hero Section */}
        {currentGame && (
          <div className="mb-10 relative group overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 to-purple-900/20 backdrop-blur-xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50"></div>
            <div className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary animate-pulse">
                    <Gamepad2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-wide">ŞU ANDA OYNANIYOR</h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/20 text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  CANLI
                </span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-center">
                 <div className="flex-1">
                    <div className="text-5xl font-black text-white mb-2 tracking-tight uppercase drop-shadow-sm">
                      {currentGame.gameName}
                    </div>
                    <div className="text-primary/80 font-medium">Oturum Devam Ediyor...</div>
                 </div>
                 
                 <div className="flex gap-6 text-white/90">
                    <div className="px-6 py-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
                       <div className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                         <Clock className="w-4 h-4" /> Süre
                       </div>
                       <div className="text-2xl font-mono font-bold tracking-wider">{formatDuration(currentGame.duration)}</div>
                    </div>
                    <div className="px-6 py-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
                       <div className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Başlangıç
                       </div>
                       <div className="text-xl font-medium">{formatDate(currentGame.startTime).split(' ')[1]}</div>
                    </div>
                 </div>
              </div>
            </div>
            {/* Animated Bottom Bar */}
            <div className="h-1 w-full bg-primary/20 mt-4">
               <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite] w-1/3"></div>
            </div>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="stats" className="space-y-8">
          <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 w-fit mx-auto md:mx-0">
            <TabsTrigger value="stats" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">İstatistikler</TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Oturum Geçmişi</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={index} className="group relative rounded-2xl border border-white/5 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-xl font-bold truncate pr-4 text-white group-hover:text-primary transition-colors">{stat._id}</h3>
                       <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-colors">
                         <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Toplam Süre</div>
                        <div className="text-3xl font-bold text-white tracking-tight">{formatDuration(stat.totalTime)}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="flex flex-col">
                           <span className="text-xs text-gray-500">Oturumlar</span>
                           <span className="font-medium text-gray-300">{stat.sessionCount} adet</span>
                        </div>
                        {stat.lastPlayed && (
                          <div className="flex flex-col text-right">
                             <span className="text-xs text-gray-500">Son Oynama</span>
                             <span className="font-medium text-gray-300">{new Date(stat.lastPlayed).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {stats.length === 0 && (
                <div className="col-span-full py-20 text-center rounded-3xl border border-dashed border-white/10 bg-white/5">
                  <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Henüz oyun verisi bulunmuyor.</p>
                  <p className="text-gray-600 text-sm mt-2">Oyun oynamaya başladığınızda istatistikler burada görünecek.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session._id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/5 group-hover:border-primary/50 transition-colors">
                      <Gamepad2 className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-primary transition-colors">{session.gameName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.startTime).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg text-emerald-400">{formatDuration(session.duration)}</div>
                    <div className="text-xs text-gray-500">Oynama Süresi</div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                 <div className="py-12 text-center text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                   Kayıtlı oturum bulunamadı.
                 </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

