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
        {currentGame ? (
          <div className="mb-10 relative group overflow-hidden rounded-3xl border border-blue-500/30 bg-[#0a0f1d] backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-transparent opacity-50"></div>
            <div className="p-10 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                    <Gamepad2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-sm font-black text-gray-400 tracking-[0.2em] uppercase">ŞU ANDA OYNANIYOR</h2>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black flex items-center gap-2 group-hover:shadow-[0_0_20px_rgba(74,222,128,0.2)] transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  CANLI
                </span>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-10 items-center">
                 <div className="flex-1 text-center lg:text-left">
                    <div className="text-6xl font-black text-white mb-3 tracking-tighter uppercase">
                      {currentGame.gameName}
                    </div>
                    <div className="text-blue-400/80 font-bold text-lg">Oturum Devam Ediyor...</div>
                 </div>
                 
                 <div className="flex gap-4 text-white">
                    <div className="px-8 py-5 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md min-w-[140px]">
                       <div className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest flex items-center gap-2">
                         <Clock className="w-3 h-3" /> Süre
                       </div>
                       <div className="text-2xl font-black">{formatDuration(currentGame.duration)}</div>
                    </div>
                    <div className="px-8 py-5 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md min-w-[160px]">
                       <div className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Başlangıç
                       </div>
                       <div className="text-2xl font-black">{formatDate(currentGame.startTime).split(' ')[1]}</div>
                    </div>
                 </div>
              </div>
            </div>
            {/* Blue Progress Indicator */}
            <div className="h-1.5 w-full bg-blue-900/20 overflow-hidden">
               <div className="h-full bg-blue-500 w-1/3 shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-[pulse_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        ) : (
          <div className="mb-10 p-10 rounded-3xl border border-white/5 bg-white/5 text-center">
            <Gamepad2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <div className="text-xl font-bold text-gray-500 uppercase tracking-widest">Şu Anda Bir Oyun Tespit Edilmedi</div>
            <p className="text-gray-600 mt-2 text-sm italic">Desteklenen bir oyunu başlattığınızda burada görünecektir.</p>
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
                <div key={index} className="group relative rounded-[2rem] border border-white/5 bg-[#0d1117] p-8 hover:bg-[#161b22] hover:border-blue-500/20 transition-all duration-300">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                       <h3 className="text-2xl font-bold text-gray-200 group-hover:text-white transition-colors lowercase">{stat._id}</h3>
                       <div className="p-2.5 rounded-xl bg-white/5">
                         <TrendingUp className="w-5 h-5 text-gray-500" />
                       </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Toplam Süre</div>
                        <div className="text-4xl font-black text-white tracking-tight">{formatDuration(stat.totalTime)}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Oturumlar</span>
                           <span className="font-bold text-gray-300">{stat.sessionCount} adet</span>
                        </div>
                        {stat.lastPlayed && (
                          <div className="flex flex-col gap-1 text-right">
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Son Oynama</span>
                             <span className="font-bold text-gray-300">{new Date(stat.lastPlayed).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
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

