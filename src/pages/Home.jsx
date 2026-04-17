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

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} sa`;
  };

  return (
    <div className="flex flex-col gap-16 pb-20 bg-[#020617]">
      {/* 1. PREMIUM HERO BANNER */}
      <section className="relative w-full h-[400px] md:h-[700px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={images.hero} 
            alt="Hero Banner" 
            className="w-full h-full object-cover scale-105 animate-[pulse_8s_ease-in-out_infinite]"
          />
          {/* Creative Layered Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.15),transparent_50%)]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 max-w-7xl">
          <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-left-12 duration-1000 ease-out">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-xl text-primary text-sm font-bold uppercase tracking-[0.2em]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
               NEO-TRACKER SYSTEM ACTIVE
            </div>
            
            <div className="space-y-6">
              <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white leading-[0.85] uppercase">
                OYUN <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.3)]">DÜNYANI</span> <br />
                KOMUTA ET
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed font-medium">
                Saniyelerini şansa bırakma. Verilerini profesyonel araçlarla takip et, 
                <span className="text-white"> potansiyelini keşfet.</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-6 pt-6">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="h-16 px-12 font-black text-xl rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0">
                    SİSTEME GİRİŞ YAP <Activity className="ml-3 w-6 h-6" />
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button size="lg" className="h-16 px-12 font-black text-xl rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0">
                    ŞİMDİ KATIL <ChevronRight className="ml-2 w-7 h-7" />
                  </Button>
                </Link>
              )}
              <Link to="/discover">
                <Button size="lg" variant="outline" className="h-16 px-10 font-bold text-lg rounded-2xl border-white/20 backdrop-blur-sm hover:bg-white/10 transition-all transform hover:-translate-y-1">
                  KEŞFET
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE STATISTICS COUNTER */}
      <section className="container mx-auto px-6 max-w-7xl -mt-20 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0f172a]/80 border-white/10 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden group hover:border-primary/50 transition-all duration-500">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Toplam Üye</p>
                <h4 className="text-4xl font-black text-white">{stats?.totalUsers || '---'}</h4>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0f172a]/80 border-white/10 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden group hover:border-cyan/50 transition-all duration-500">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Gamepad2 className="w-10 h-10 text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Oynanan Oyun</p>
                <h4 className="text-4xl font-black text-white">{stats?.totalSessionsCount || '---'}</h4>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f172a]/80 border-white/10 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden group hover:border-purple/50 transition-all duration-500">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Timer className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Toplam Süre</p>
                <h4 className="text-4xl font-black text-white">{stats ? `${Math.round(stats.totalPlayHours)} Sa` : '---'}</h4>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. LEADERBOARDS (WEEKLY/MONTHLY) */}
      <section className="container mx-auto px-6 max-w-7xl">
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-primary font-bold tracking-widest text-xs uppercase mb-2">
                <TrendingUp className="w-4 h-4" /> TRENDLER
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white">LİDERLİK TABLOSU</h2>
              <p className="text-slate-400 text-lg">Platformun en aktif isimleri ve en çok tercih edilen oyunları.</p>
            </div>

            <div className="flex p-1.5 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5">
              <button 
                onClick={() => setPeriod('week')}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${period === 'week' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
              >
                HAFTALIK
              </button>
              <button 
                onClick={() => setPeriod('month')}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${period === 'month' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
              >
                AYLIK
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Top Games */}
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-orange-500" />
                </div>
                EN ÇOK OYNANALAR
              </h3>
              <div className="space-y-4">
                {(period === 'week' ? topGamesWeek : topGamesMonth).slice(0, 5).map((game, idx) => (
                  <div key={game.gameName} className="group relative bg-[#0f172a]/40 border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-[#1e293b]/60 hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <span className="text-3xl font-black text-slate-800 group-hover:text-primary/20 transition-colors w-8">{idx + 1}</span>
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-white uppercase tracking-tight">{game.gameName}</p>
                        <p className="text-sm text-slate-500 font-medium">{game.sessionCount} Oturum</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary">{game.totalHours} SA</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">TOPLAM SÜRE</p>
                    </div>
                  </div>
                ))}
                {(period === 'week' ? topGamesWeek : topGamesMonth).length === 0 && !loading && (
                   <div className="py-20 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-3xl">Henüz veri yok</div>
                )}
              </div>
            </div>

            {/* Top Players */}
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-500" />
                </div>
                EN AKTİF OYUNCULAR
              </h3>
              <div className="space-y-4">
                {(period === 'week' ? activeUsersWeek : activeUsersMonth).slice(0, 5).map((u, idx) => (
                  <div key={u.username} className="group relative bg-[#0f172a]/40 border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-[#1e293b]/60 hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <span className="text-3xl font-black text-slate-800 group-hover:text-primary/20 transition-colors w-8">{idx + 1}</span>
                      <Link to={`/profile/${u.username}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-white/5 overflow-hidden">
                           {u.avatar ? (
                             <img src={u.avatar} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold">{u.username[0]}</div>
                           )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-lg font-bold text-white">{u.globalName || u.username}</p>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">LVL {u.level || 1} OYUNCU</p>
                        </div>
                      </Link>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-green-400">{u.totalHours} SA</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AKTİF SÜRE</p>
                    </div>
                  </div>
                ))}
                 {(period === 'week' ? activeUsersWeek : activeUsersMonth).length === 0 && !loading && (
                   <div className="py-20 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-3xl">Henüz veri yok</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FUTURISTIC FEATURES BENTO GRID */}
      <section className="container mx-auto px-6 max-w-7xl">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter">GELİŞMİŞ SENSÖRLER</h2>
          <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
          {/* Card 1: Large Feature */}
          <div className="md:col-span-8 group relative bg-[#0b0e14] border border-white/5 rounded-[3rem] p-10 overflow-hidden flex flex-col justify-end">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
               <TrendingUp className="w-64 h-64 text-primary" />
            </div>
            <div className="relative z-10 space-y-6">
               <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-primary" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-4xl font-black text-white uppercase italic">Anlık Analiz Paneli</h3>
                 <p className="text-slate-400 text-xl max-w-md">
                   Hangi gün, hangi saatte daha verimlisin? Tüm verilerini milisaniyelik hassasiyetle görselleştiriyoruz.
                 </p>
               </div>
               <div className="pt-6">
                 <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse" />
                 </div>
               </div>
            </div>
          </div>

          {/* Card 2: Small Feature */}
          <div className="md:col-span-4 group relative bg-[#0b0e14] border border-white/5 rounded-[3rem] p-8 overflow-hidden flex flex-col items-center justify-center text-center">
             <div className="mb-8 relative">
                <div className="w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                   <div className="absolute inset-2 rounded-full border-2 border-dashed border-primary/40 animate-[spin_20s_linear_infinite]" />
                   <Shield className="w-14 h-14 text-primary" />
                </div>
             </div>
             <h3 className="text-2xl font-black text-white mb-4 uppercase italic">TAM OTOMATİK SİSTEM</h3>
             <p className="text-slate-400 font-medium leading-relaxed">
               Arka planda sessizce çalışır. Siz sadece oyunun tadını çıkarın, biz her şeyi kaydederiz.
             </p>
          </div>

          {/* Card 3: Small Feature */}
          <div className="md:col-span-4 group relative bg-[#0b0e14] border border-white/5 rounded-[3rem] p-8 overflow-hidden flex flex-col items-center justify-center text-center">
             <div className="mb-8 flex -space-x-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full bg-slate-800 border-2 border-background flex items-center justify-center text-xs font-bold text-slate-500">
                    U{i}
                  </div>
                ))}
             </div>
             <h3 className="text-2xl font-black text-white mb-4 uppercase italic">SOSYAL ENTEGRASYON</h3>
             <p className="text-slate-400 font-medium leading-relaxed">
               Arkadaşlarınızla sürelerinizi yarıştırın, kimin gerçek bir 'gamer' olduğunu kanıtlayın.
             </p>
          </div>

          {/* Card 4: Medium Feature */}
          <div className="md:col-span-8 group relative bg-[#0b0e14] border border-white/5 rounded-[3rem] p-10 overflow-hidden flex flex-col justify-center">
             <div className="flex items-center gap-10">
               <div className="space-y-6 flex-1">
                 <h3 className="text-3xl font-black text-white uppercase italic">EVRENSEL OYUN KÜTÜPHANESİ</h3>
                 <p className="text-slate-400 text-lg">
                   Onbinlerce oyunu otomatik tanır. Steam, Epic veya korsan fark etmeksizin her oyunu takip etmenizi sağlar.
                 </p>
                 <Button variant="secondary" className="bg-white/5 hover:bg-white/10 text-white border-white/5 px-8 rounded-xl font-bold">
                   Kütüphaneye Göz At
                 </Button>
               </div>
               <div className="hidden md:block w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[2.5rem] p-6 border border-white/5 rotate-6 group-hover:rotate-0 transition-transform">
                  <Zap className="w-full h-full text-indigo-400" />
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="container mx-auto px-6 max-w-5xl py-20">
         <div className="relative rounded-[4rem] bg-gradient-to-br from-primary to-indigo-600 p-1 md:p-1.5 shadow-[0_0_100px_rgba(59,130,246,0.3)]">
            <div className="bg-[#020617] rounded-[3.8rem] p-12 md:p-24 text-center space-y-10 overflow-hidden relative">
               {/* Decorative background blobs */}
               <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
               <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
               
               <div className="relative z-10 space-y-6">
                 <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic">GELECEĞİ TAKİP ET</h2>
                 <p className="text-slate-400 text-xl md:text-2xl max-w-2xl mx-auto font-medium">
                   Bugün katıl ve oyun geçmişini ölümsüzleştir. Hiçbir saniyen unutulmasın.
                 </p>
                 <div className="pt-8">
                   <Link to="/register">
                    <Button size="lg" className="h-20 px-16 rounded-3xl font-black text-2xl bg-white text-black hover:bg-white/90 shadow-2xl transition-all transform hover:scale-110 active:scale-95">
                      HEMEN ÜYE OL
                    </Button>
                   </Link>
                 </div>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}

