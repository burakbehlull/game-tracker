import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Zap, Users, ChevronRight, BarChart3, Shield, Trophy, Gamepad2, Timer, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAssetUrl } from '../lib/assetHelper';
import { api } from '../services/api';

export default function Home({ user }) {
  const [stats, setStats] = useState(null);
  const [topGamesWeek, setTopGamesWeek] = useState([]);
  const [topGamesMonth, setTopGamesMonth] = useState([]);
  const [activeUsersWeek, setActiveUsersWeek] = useState([]);
  const [activeUsersMonth, setActiveUsersMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week'); // 'week' | 'month'

  const images = {
    hero: getAssetUrl('assets/hero_banner.png'),
    card1: getAssetUrl('assets/card1.png'),
    card2: getAssetUrl('assets/card2.png'),
    card3: getAssetUrl('assets/card3.png')
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [global, gamesW, gamesM, usersW, usersM] = await Promise.all([
          api.getGlobalStats(),
          api.getTopGamesByPeriod('week'),
          api.getTopGamesByPeriod('month'),
          api.getActiveUsersByPeriod('week'),
          api.getActiveUsersByPeriod('month')
        ]);
        setStats(global);
        setTopGamesWeek(gamesW);
        setTopGamesMonth(gamesM);
        setActiveUsersWeek(usersW);
        setActiveUsersMonth(usersM);
      } catch (error) {
        console.error('Failed to fetch home stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0 sn';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h} sa ${m} dk ${s} sn`;
    } else if (m > 0) {
      return `${m} dk ${s} sn`;
    } else {
      return `${s} sn`;
    }
  };

  return (
    <div className="flex flex-col gap-16 pb-20 bg-[#020617]">
      {/* 1. PREMIUM HERO BANNER */}
      <section className="relative w-full h-[400px] md:h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={images.hero} 
            alt="Hero Banner" 
            className="w-full h-full object-cover scale-105 animate-[pulse_8s_ease-in-out_infinite]"
          />
          {/* Creative Layered Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.1),transparent_50%)]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 max-w-7xl">
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000 ease-out">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-xl text-primary text-xs font-bold uppercase tracking-[0.2em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
               NEO-TRACKER SYSTEM ACTIVE
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.9] uppercase">
                OYUN <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.2)]">DÜNYANI</span> <br />
                KOMUTA ET
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-xl leading-relaxed font-medium">
                Saniyelerini şansa bırakma. Verilerini profesyonel araçlarla takip et, 
                <span className="text-white"> potansiyelini keşfet.</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-5 pt-4">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="h-14 px-10 font-black text-lg rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0">
                    SİSTEME GİRİŞ YAP <Activity className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button size="lg" className="h-14 px-10 font-black text-lg rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0">
                    ŞİMDİ KATIL <ChevronRight className="ml-1 w-6 h-6" />
                  </Button>
                </Link>
              )}
              <Link to="/discover">
                
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE STATISTICS COUNTER */}
      <section className="container mx-auto px-6 max-w-7xl -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0f172a]/80 border-white/10 backdrop-blur-2xl rounded-[1.5rem] overflow-hidden group hover:border-primary/50 transition-all duration-500 shadow-2xl">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-0.5">Toplam Üye</p>
                <h4 className="text-3xl font-black text-white">{stats?.totalUsers || '---'}</h4>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f172a]/80 border-white/10 backdrop-blur-2xl rounded-[1.5rem] overflow-hidden group hover:border-cyan/50 transition-all duration-500 shadow-2xl">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Gamepad2 className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-0.5">Oynanan Oyun</p>
                <h4 className="text-3xl font-black text-white">{stats?.totalSessionsCount || '---'}</h4>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f172a]/80 border-white/10 backdrop-blur-2xl rounded-[1.5rem] overflow-hidden group hover:border-purple/50 transition-all duration-500 shadow-2xl">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Timer className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-0.5">Toplam Süre</p>
                <h4 className="text-3xl font-black text-white">{stats ? `${Math.round(stats.totalPlayHours)} Sa` : '---'}</h4>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. LEADERBOARDS (WEEKLY/MONTHLY) */}
      <section className="container mx-auto px-6 max-w-7xl">
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-primary font-bold tracking-widest text-[10px] uppercase mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> TRENDLER
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tight">LİDERLİK TABLOSU</h2>
              <p className="text-slate-500 text-base">En aktif isimler ve popüler oyunlar.</p>
            </div>

            <div className="flex p-1 bg-slate-900/50 backdrop-blur-md rounded-xl border border-white/5">
              <button 
                onClick={() => setPeriod('week')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${period === 'week' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
              >
                HAFTALIK
              </button>
              <button 
                onClick={() => setPeriod('month')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${period === 'month' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
              >
                AYLIK
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Games */}
            <div className="space-y-5">
              <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-orange-500" />
                </div>
                EN ÇOK OYNANALAR
              </h3>
              <div className="space-y-3">
                {(period === 'week' ? topGamesWeek : topGamesMonth).slice(0, 5).map((game, idx) => (
                  <div key={game.gameName} className="group relative bg-[#0f172a]/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-[#1e293b]/60 hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-slate-800 group-hover:text-primary/20 transition-colors w-6">{idx + 1}</span>
                      <div className="space-y-0.5">
                        <p className="text-base font-bold text-white uppercase tracking-tight">{game.gameName}</p>
                        <p className="text-xs text-slate-500 font-medium">{game.sessionCount} Oturum</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">{formatDuration(game.totalDuration)}</p>
                    </div>
                  </div>
                ))}
                {(period === 'week' ? topGamesWeek : topGamesMonth).length === 0 && !loading && (
                   <div className="py-16 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-2xl text-sm">Henüz veri yok</div>
                )}
              </div>
            </div>

            {/* Top Players */}
            <div className="space-y-5">
              <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                EN AKTİF OYUNCULAR
              </h3>
              <div className="space-y-3">
                {(period === 'week' ? activeUsersWeek : activeUsersMonth).slice(0, 5).map((u, idx) => (
                  <div key={u.username} className="group relative bg-[#0f172a]/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-[#1e293b]/60 hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-slate-800 group-hover:text-primary/20 transition-colors w-6">{idx + 1}</span>
                      <Link to={`/profile/${u.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border-2 border-white/5 overflow-hidden">
                           {u.avatar ? (
                             <img src={u.avatar} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-bold">{u.username[0]}</div>
                           )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-base font-bold text-white">{u.globalName || u.username}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">LVL {u.level || 1}</p>
                        </div>
                      </Link>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-green-400">{formatDuration(u.totalDuration)}</p>
                    </div>
                  </div>
                ))}
                 {(period === 'week' ? activeUsersWeek : activeUsersMonth).length === 0 && !loading && (
                   <div className="py-16 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-2xl text-sm">Henüz veri yok</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FUTURISTIC FEATURES BENTO GRID */}
      <section className="container mx-auto px-6 max-w-7xl">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">GELİŞMİŞ SENSÖRLER</h2>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-auto md:h-[550px]">
          {/* Card 1: Large Feature */}
          <div className="md:col-span-8 group relative bg-[#0b0e14] border border-white/5 rounded-[2rem] p-8 overflow-hidden flex flex-col justify-end">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
               <TrendingUp className="w-48 h-48 text-primary" />
            </div>
            <div className="relative z-10 space-y-4">
               <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-primary" />
               </div>
               <div className="space-y-1">
                 <h3 className="text-3xl font-black text-white uppercase italic">Anlık Analiz Paneli</h3>
                 <p className="text-slate-400 text-lg max-w-md">
                   Hangi gün, hangi saatte daha verimlisin? Tüm verilerini milisaniyelik hassasiyetle görselleştiriyoruz.
                 </p>
               </div>
               <div className="pt-4">
                 <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse" />
                 </div>
               </div>
            </div>
          </div>

          {/* Card 2: Small Feature */}
          <div className="md:col-span-4 group relative bg-[#0b0e14] border border-white/5 rounded-[2rem] p-8 overflow-hidden flex flex-col items-center justify-center text-center">
             <div className="mb-6 relative">
                <div className="w-24 h-24 rounded-full border-2 border-primary/20 flex items-center justify-center relative">
                   <div className="absolute inset-1 rounded-full border border-dashed border-primary/40 animate-[spin_20s_linear_infinite]" />
                   <Shield className="w-10 h-10 text-primary" />
                </div>
             </div>
             <h3 className="text-xl font-black text-white mb-2 uppercase italic">TAM OTOMATİK SİSTEM</h3>
             <p className="text-slate-500 text-sm font-medium leading-relaxed">
               Arka planda sessizce çalışır. Siz sadece oyunun tadını çıkarın, biz her şeyi kaydederiz.
             </p>
          </div>

          {/* Card 3: Small Feature */}
          <div className="md:col-span-4 group relative bg-[#0b0e14] border border-white/5 rounded-[2rem] p-8 overflow-hidden flex flex-col items-center justify-center text-center">
             <div className="mb-6 flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-background flex items-center justify-center text-[10px] font-bold text-slate-500">
                    U{i}
                  </div>
                ))}
             </div>
             <h3 className="text-xl font-black text-white mb-2 uppercase italic">SOSYAL ENTEGRASYON</h3>
             <p className="text-slate-500 text-sm font-medium leading-relaxed">
               Arkadaşlarınızla sürelerinizi yarıştırın, kimin gerçek bir 'gamer' olduğunu kanıtlayın.
             </p>
          </div>

          {/* Card 4: Medium Feature */}
          <div className="md:col-span-8 group relative bg-[#0b0e14] border border-white/5 rounded-[2rem] p-8 overflow-hidden flex flex-col justify-center">
             <div className="flex items-center gap-8">
               <div className="space-y-4 flex-1">
                 <h3 className="text-2xl font-black text-white uppercase italic">EVRENSEL OYUN KÜTÜPHANESİ</h3>
                 <p className="text-slate-400 text-base">
                   Onbinlerce oyunu otomatik tanır. Steam, Epic veya kütüphane fark etmeksizin her oyunu takip etmenizi sağlar.
                 </p>
                 <Button variant="secondary" className="bg-white/5 hover:bg-white/10 text-white border-white/5 px-6 h-10 rounded-lg text-sm font-bold">
                   Kütüphaneye Göz At
                 </Button>
               </div>
               <div className="hidden md:block w-36 h-36 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[2rem] p-6 border border-white/5 rotate-6 group-hover:rotate-0 transition-transform">
                  <Zap className="w-full h-full text-indigo-400" />
               </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

