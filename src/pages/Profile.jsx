import { useState, useEffect } from 'react';
import { Settings, MessageSquare, Award, Monitor, Clock, Trophy, Zap, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { api } from '../services/api';

export default function Profile({ user }) {
  const [stats, setStats] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await api.getStats();
      // Sort by last played (descending)
      statsData.sort((a, b) => {
        const dateA = a.lastPlayed ? new Date(a.lastPlayed) : new Date(0);
        const dateB = b.lastPlayed ? new Date(b.lastPlayed) : new Date(0);
        return dateB - dateA;
      });
      setStats(statsData);
      
      const total = statsData.reduce((sum, stat) => sum + stat.totalTime, 0);
      setTotalTime(total);
      setLoading(false);
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
      setLoading(false);
    }
  };

  const formatTotalHours = (seconds) => {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} saat`;
  };

  const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Hiç oynanmadı';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getGameImage = (gameName) => {
    return `https://placehold.co/600x400/1a1a1a/FFF?text=${encodeURIComponent(gameName)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-primary font-medium">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-12">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
      
      <div className="container max-w-6xl mx-auto pt-16 px-4 relative z-10">
        
        {/* Glass Profile Header */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40 mb-8 group">
          {/* Header Banners/Background */}
          <div className="h-48 w-full bg-gradient-to-r from-blue-900/40 to-purple-900/40 relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            
            {/* Online Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-xs font-medium text-white/90">Çevrimiçi</span>
            </div>
          </div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-6 relative">
              
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-32 h-32 rounded-2xl p-1 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/10 shadow-xl">
                  <img 
                    src="https://placehold.co/128x128/2a2a2a/FFF?text=Avatar" 
                    alt="Avatar" 
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 border-2 border-background shadow-lg flex items-center justify-center font-bold text-white text-sm">
                  4
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">{user?.username}</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-4 h-4" />
                    PC Gamer
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{user?.email}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-primary/80">User ID: #82910</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 md:mt-0">
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-md gap-2">
                  <Settings className="w-4 h-4" />
                  Düzenle
                </Button>
                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Mesaj
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          
          {/* Main Content - Activity Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Son Aktiviteler
              </h2>
              <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
                Son 2 haftada {formatTotalHours(totalTime)}
              </span>
            </div>

            <div className="space-y-4">
              {stats.length > 0 ? (
                stats.map((stat, i) => (
                  <div 
                    key={stat._id} 
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent p-4 transition-all duration-300 hover:border-primary/20 hover:bg-white/10 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex gap-5">
                      {/* Game Art */}
                      <div className="relative shrink-0 w-32 h-20 rounded-lg overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-500">
                        <img 
                          src={getGameImage(stat._id)} 
                          alt={stat._id}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                            {stat._id}
                          </h3>
                          <div className="text-right shrink-0">
                            <span className="block text-xl font-bold text-foreground">
                              {formatTotalHours(stat.totalTime)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded">
                              <Trophy className="w-3 h-3 text-yellow-500" /> 
                              1/1 Başarım
                            </span>
                            <span className="flex items-center gap-1.5 ">
                              <Clock className="w-3 h-3" />
                              Son: {formatLastPlayed(stat.lastPlayed)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/5">
                  <p className="text-muted-foreground">Henüz oyun aktivitesi bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats Card */}
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">İstatistikler</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="text-2xl font-bold text-foreground">{stats.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Oyun</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="text-2xl font-bold text-foreground">{formatTotalHours(totalTime)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Toplam Süre</div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rozetler</h3>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">3 Yeni</span>
              </div>
              
              <div className="flex gap-2 text-white">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 flex items-center justify-center font-bold text-sm hover:scale-110 transition-transform cursor-pointer">
                  5+
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20 flex items-center justify-center font-bold text-[10px] hover:scale-110 transition-transform cursor-pointer">
                  2025
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20 flex items-center justify-center font-bold text-sm hover:scale-110 transition-transform cursor-pointer">
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </div>
            </div>

            {/* Groups/Community */}
            <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6">
               <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Topluluklar</h3>
               <div className="flex items-center gap-3 p-2 -mx-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                 <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                   <Monitor className="w-5 h-5" />
                 </div>
                 <div>
                   <div className="font-medium text-sm group-hover:text-primary transition-colors">Son Minikkıraft Bükücüler</div>
                   <div className="text-xs text-muted-foreground">1.2k Üye</div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


